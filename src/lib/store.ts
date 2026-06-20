import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Redis } from "@upstash/redis";

import {
  atsReportSchema,
  createEmptyResume,
  normalizeResumeContent,
  tailoredResumeVersionSchema,
  targetJobSchema,
  type AtsReport,
  type BaseResume,
  type TailoredResumeVersion,
  type TargetJob,
} from "@/lib/resume/schema";
import { repairImportedExperiences, repairResumeCertifications } from "@/lib/resume/importResume";
import type {
  AppStore,
  ApplicationRecord,
  ApplicationStatus,
  SessionRecord,
  User,
} from "@/lib/types";

const STORE_PATH =
  process.env.STORE_PATH?.trim() || path.join(process.cwd(), "data", "app-store.json");
const REDIS_STORE_KEY = "talent-portal:app-store";

const defaultStore: AppStore = {
  users: [],
  sessions: [],
  baseResumes: [],
  targetJobs: [],
  tailoredResumeVersions: [],
  atsReports: [],
  applications: [],
};

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function normalizeStore(parsed: Partial<AppStore> | null | undefined): AppStore {
  const store = {
    ...defaultStore,
    ...parsed,
  };

  store.users = store.users.map((user) => migrateLegacyUser(user));

  for (const resume of store.baseResumes) {
    const user = store.users.find((entry) => entry.id === resume.userId);
    resume.content = normalizeResumeContent(resume.content, { fallbackEmail: user?.email });
  }

  for (const version of store.tailoredResumeVersions) {
    const user = store.users.find((entry) => entry.id === version.userId);
    version.resume = normalizeResumeContent(version.resume, { fallbackEmail: user?.email });
  }

  return store;
}

async function readStoreFromRedis(): Promise<AppStore | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const parsed = await redis.get<Partial<AppStore>>(REDIS_STORE_KEY);
  return normalizeStore(parsed ?? undefined);
}

async function writeStoreToRedis(store: AppStore) {
  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  await redis.set(REDIS_STORE_KEY, store);
  return true;
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

export async function readStore(): Promise<AppStore> {
  const redisStore = await readStoreFromRedis();
  if (redisStore) {
    return redisStore;
  }

  await ensureStoreFile();
  const raw = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppStore>;

  return normalizeStore(parsed);
}

async function writeStore(store: AppStore) {
  const wroteToRedis = await writeStoreToRedis(store);
  if (wroteToRedis) {
    return;
  }

  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function mutateStore<T>(mutator: (store: AppStore) => T | Promise<T>) {
  const store = await readStore();
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

function migrateLegacyUser(user: User): User {
  const username =
    user.username?.trim() ||
    user.email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32) ||
    "user";

  return {
    ...user,
    username,
  };
}

export async function createUserAccount(input: {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
}) {
  return mutateStore((store) => {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();

    if (store.users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error("An account with this email already exists.");
    }

    if (store.users.some((user) => user.username.toLowerCase() === username)) {
      throw new Error("This username is already taken.");
    }

    const user: User = {
      id: crypto.randomUUID(),
      username: input.username.trim(),
      email,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };

    store.users.push(user);
    store.baseResumes.push(createEmptyResume(user.id, user.email, user.name));

    return user;
  });
}

export async function createUser(input: { email: string; name: string }) {
  return mutateStore((store) => {
    const existing = store.users.find(
      (user) => user.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (existing) {
      return existing;
    }

    const user: User = {
      id: crypto.randomUUID(),
      username:
        input.email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32) || "user",
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      createdAt: new Date().toISOString(),
    };

    store.users.push(user);
    store.baseResumes.push(createEmptyResume(user.id, user.email, user.name));

    return user;
  });
}

export async function findUserByEmail(email: string) {
  const store = await readStore();
  return store.users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
}

export async function findUserByUsername(username: string) {
  const store = await readStore();
  return store.users.find(
    (user) => user.username.toLowerCase() === username.trim().toLowerCase(),
  );
}

export async function createSession(userId: string) {
  return mutateStore((store) => {
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };

    store.sessions = store.sessions.filter((entry) => entry.userId !== userId);
    store.sessions.push(session);

    return session;
  });
}

export async function deleteSession(sessionId: string) {
  return mutateStore((store) => {
    store.sessions = store.sessions.filter((session) => session.id !== sessionId);
  });
}

export async function getUserBySession(sessionId: string | undefined) {
  if (!sessionId) {
    return null;
  }

  const store = await readStore();
  const session = store.sessions.find((entry) => entry.id === sessionId);
  if (!session) {
    return null;
  }

  return store.users.find((user) => user.id === session.userId) ?? null;
}

export async function getDashboardData(userId: string) {
  const store = await readStore();

  return {
    resumes: store.baseResumes
      .filter((resume) => resume.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    jobs: store.targetJobs
      .filter((job) => job.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    versions: store.tailoredResumeVersions
      .filter((version) => version.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    applications: store.applications
      .filter((application) => application.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export async function createResume(userId: string, email: string, name: string) {
  return mutateStore((store) => {
    const resume = createEmptyResume(userId, email, name);
    store.baseResumes.push(resume);
    return resume;
  });
}

export async function getResumeById(userId: string, resumeId: string) {
  const store = await readStore();
  return (
    store.baseResumes.find((resume) => resume.id === resumeId && resume.userId === userId) ??
    null
  );
}

export async function updateResume(userId: string, resumeId: string, resume: BaseResume["content"]) {
  return mutateStore((store) => {
    const existing = store.baseResumes.find(
      (entry) => entry.id === resumeId && entry.userId === userId,
    );
    if (!existing) {
      throw new Error("Resume not found.");
    }

    const user = store.users.find((entry) => entry.id === userId);
    const repaired = repairResumeCertifications({
      ...resume,
      experiences: repairImportedExperiences(resume.experiences),
    });
    const validated = normalizeResumeContent(repaired, { fallbackEmail: user?.email });
    existing.content = validated;
    existing.updatedAt = new Date().toISOString();

    return existing;
  });
}

export async function saveTargetJob(userId: string, targetJob: Omit<TargetJob, "id" | "userId" | "createdAt">) {
  return mutateStore((store) => {
    const job = targetJobSchema.parse({
      ...targetJob,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    });

    store.targetJobs.push(job);
    return job;
  });
}

export async function saveAtsReport(userId: string, report: Omit<AtsReport, "id" | "userId" | "createdAt">) {
  return mutateStore((store) => {
    const saved = atsReportSchema.parse({
      ...report,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    });

    store.atsReports.push(saved);
    return saved;
  });
}

export async function saveTailoredResumeVersion(
  userId: string,
  version: Omit<TailoredResumeVersion, "id" | "userId" | "createdAt">,
) {
  return mutateStore((store) => {
    const saved = tailoredResumeVersionSchema.parse({
      ...version,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    });

    store.tailoredResumeVersions.push(saved);
    return saved;
  });
}

export async function getResumeWorkspace(userId: string, resumeId: string) {
  const store = await readStore();
  const resume = store.baseResumes.find(
    (entry) => entry.id === resumeId && entry.userId === userId,
  );

  if (!resume) {
    return null;
  }

  const versions = store.tailoredResumeVersions
    .filter((entry) => entry.baseResumeId === resumeId && entry.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const reports = store.atsReports.filter((entry) => entry.userId === userId);
  const jobs = store.targetJobs.filter((entry) => entry.userId === userId);
  const applications = store.applications.filter((entry) => entry.userId === userId);

  const user = store.users.find((entry) => entry.id === userId);
  const repairedContent = normalizeResumeContent(
    repairResumeCertifications({
      ...resume.content,
      experiences: repairImportedExperiences(resume.content.experiences),
    }),
    { fallbackEmail: user?.email },
  );

  return {
    resume: {
      ...resume,
      content: repairedContent,
    },
    versions,
    reports,
    jobs,
    applications,
  };
}

export async function getResumeVersion(userId: string, versionId: string) {
  const store = await readStore();
  const version = store.tailoredResumeVersions.find(
    (entry) => entry.id === versionId && entry.userId === userId,
  );

  if (!version) {
    return null;
  }

  return {
    version,
    report:
      store.atsReports.find(
        (entry) => entry.id === version.atsReportId && entry.userId === userId,
      ) ?? null,
    job:
      store.targetJobs.find(
        (entry) => entry.id === version.targetJobId && entry.userId === userId,
      ) ?? null,
    baseResume:
      store.baseResumes.find(
        (entry) => entry.id === version.baseResumeId && entry.userId === userId,
      ) ?? null,
    applications: store.applications.filter(
      (entry) => entry.resumeVersionId === version.id && entry.userId === userId,
    ),
  };
}

export async function createApplication(
  userId: string,
  input: {
    resumeVersionId: string;
    targetJobId: string;
    company: string;
    role: string;
    source: string;
    notes: string;
    meta?: ApplicationRecord["meta"];
  },
) {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    const application: ApplicationRecord = {
      id: crypto.randomUUID(),
      userId,
      resumeVersionId: input.resumeVersionId,
      targetJobId: input.targetJobId,
      company: input.company.trim(),
      role: input.role.trim(),
      source: input.source.trim(),
      status: "saved",
      notes: input.notes.trim(),
      meta: input.meta,
      createdAt: now,
      updatedAt: now,
    };

    store.applications.push(application);
    return application;
  });
}

export async function updateApplicationStatus(
  userId: string,
  applicationId: string,
  status: ApplicationStatus,
) {
  return mutateStore((store) => {
    const application = store.applications.find(
      (entry) => entry.id === applicationId && entry.userId === userId,
    );
    if (!application) {
      throw new Error("Application not found.");
    }

    application.status = status;
    application.updatedAt = new Date().toISOString();

    return application;
  });
}

export async function getApplications(userId: string) {
  const store = await readStore();

  return {
    applications: store.applications
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    versions: store.tailoredResumeVersions.filter((entry) => entry.userId === userId),
    jobs: store.targetJobs.filter((entry) => entry.userId === userId),
  };
}
