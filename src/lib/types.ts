import type {
  AtsReport,
  BaseResume,
  TailoredResumeVersion,
  TargetJob,
} from "@/lib/resume/schema";

export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  passwordHash?: string;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
};

export type ApplicationStatus =
  | "draft"
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export type ApplicationMeta = {
  keywords_matched: string[];
  keywords_missing: string[];
};

export type ApplicationRecord = {
  id: string;
  userId: string;
  resumeVersionId: string;
  targetJobId: string;
  company: string;
  role: string;
  source: string;
  status: ApplicationStatus;
  notes: string;
  meta?: ApplicationMeta;
  createdAt: string;
  updatedAt: string;
};

export type AppStore = {
  users: User[];
  sessions: SessionRecord[];
  baseResumes: BaseResume[];
  targetJobs: TargetJob[];
  tailoredResumeVersions: TailoredResumeVersion[];
  atsReports: AtsReport[];
  applications: ApplicationRecord[];
};
