import { z } from "zod";

const emailSchema = z.email();

export function sanitizePersonalEmail(value: string, fallback = "") {
  const candidates = [
    value.trim(),
    value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "",
    fallback.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && emailSchema.safeParse(candidate).success) {
      return candidate;
    }
  }

  const localPart =
    value.split("@")[0]?.replace(/[^a-z0-9._+-]/gi, "").slice(0, 64) ||
    fallback.split("@")[0]?.replace(/[^a-z0-9._+-]/gi, "").slice(0, 64) ||
    "contact";

  return `${localPart}@example.com`;
}

const PLACEHOLDER_PERSONAL_URL_PATTERNS = [
  /your-profile/i,
  /your-handle/i,
  /linkedin\.com\/in\/your\b/i,
  /github\.com\/your-handle/i,
];

export function isPlaceholderPersonalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return PLACEHOLDER_PERSONAL_URL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizePersonalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderPersonalUrl(trimmed)) {
    return "";
  }

  return trimmed;
}

const personalDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  headline: z.string().trim().optional().default(""),
  email: z.email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Phone is required."),
  location: z.string().trim().min(2, "Location is required."),
  linkedin: z.string().trim().optional().default(""),
  github: z.string().trim().optional().default(""),
  portfolio: z.string().trim().optional().default(""),
});

const experienceSchema = z.object({
  id: z.string(),
  company: z.string().trim().min(1, "Company is required."),
  title: z.string().trim().min(1, "Role title is required."),
  location: z.string().trim().optional().default(""),
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().min(1, "End date is required."),
  bullets: z
    .array(z.string().trim().min(1))
    .min(1, "Each experience needs at least one bullet."),
});

const educationSchema = z.object({
  id: z.string(),
  school: z.string().trim().min(1, "School is required."),
  degree: z.string().trim().min(1, "Degree is required."),
  location: z.string().trim().optional().default(""),
  graduationDate: z.string().trim().min(1, "Graduation date is required."),
  highlights: z.array(z.string().trim().min(1)).default([]),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Project name is required."),
  role: z.string().trim().optional().default(""),
  url: z.string().trim().optional().default(""),
  bullets: z
    .array(z.string().trim().min(1))
    .min(1, "Each project needs at least one bullet."),
});

export const skillGroupSchema = z.object({
  category: z.string().trim().min(1),
  items: z.array(z.string().trim().min(1)).min(1),
});

export const certificationSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  issuer: z.string().trim().optional().default(""),
  date: z.string().trim().optional().default(""),
});

export const resumeContentSchema = z.object({
  title: z.string().trim().min(1, "Resume title is required."),
  personal: personalDetailsSchema,
  summary: z.string().trim().min(20, "Summary should be at least 20 characters."),
  skillGroups: z.array(skillGroupSchema).min(1, "Add at least one skill group."),
  experiences: z.array(experienceSchema).min(1, "Add at least one experience."),
  education: z.array(educationSchema).min(1, "Add at least one education entry."),
  certifications: z.array(certificationSchema).default([]),
  projects: z.array(projectSchema).default([]),
});

export const baseResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  content: resumeContentSchema,
});

export const targetJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  sourceUrl: z.string().trim().optional().default(""),
  description: z.string().trim().min(40),
  keywords: z.array(z.string().trim().min(1)),
  responsibilities: z.array(z.string().trim().min(1)),
  createdAt: z.string(),
});

export const atsReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  resumeVersionId: z.string(),
  overallScore: z.number().min(0).max(100),
  keywordCoverage: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  missingSections: z.array(z.string()),
  warnings: z.array(z.string()),
  diffHighlights: z.array(z.string()),
  createdAt: z.string(),
});

export const tailoredResumeVersionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  baseResumeId: z.string(),
  targetJobId: z.string(),
  title: z.string(),
  resume: resumeContentSchema,
  changeSummary: z.array(z.string()),
  atsReportId: z.string(),
  createdAt: z.string(),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type BaseResume = z.infer<typeof baseResumeSchema>;
export type TargetJob = z.infer<typeof targetJobSchema>;
export type AtsReport = z.infer<typeof atsReportSchema>;
export type TailoredResumeVersion = z.infer<typeof tailoredResumeVersionSchema>;

export function dedupeStringsCaseInsensitive(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

type LegacyResumeContent = ResumeContent & { skills?: string[] };

export function normalizeResumeContent(
  input: unknown,
  options?: { fallbackEmail?: string },
): ResumeContent {
  const record =
    input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : input;

  if (!record || typeof record !== "object") {
    throw new Error("Invalid resume content.");
  }

  const content = record as LegacyResumeContent & Record<string, unknown>;

  if (!content.skillGroups && Array.isArray(content.skills)) {
    content.skillGroups = [{ category: "Skills", items: content.skills }];
  }

  delete content.skills;

  if (!content.certifications) {
    content.certifications = [];
  }

  const personal =
    content.personal && typeof content.personal === "object"
      ? { ...(content.personal as Record<string, unknown>) }
      : {};

  if (!personal.headline) {
    personal.headline = "";
  }
  if (!personal.github) {
    personal.github = "";
  }

  personal.email = sanitizePersonalEmail(
    String(personal.email ?? ""),
    options?.fallbackEmail ?? "",
  );
  personal.linkedin = sanitizePersonalUrl(String(personal.linkedin ?? ""));
  personal.github = sanitizePersonalUrl(String(personal.github ?? ""));
  personal.portfolio = sanitizePersonalUrl(String(personal.portfolio ?? ""));

  content.personal = personal as ResumeContent["personal"];

  return resumeContentSchema.parse(content);
}

function normalizeBlockEntries(raw: string) {
  return raw
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function readLabeledLine(lines: string[], label: string) {
  const prefix = `${label}:`;
  const match = lines.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()));
  return match ? match.slice(prefix.length).trim() : "";
}

export function parseSkillGroups(raw: string) {
  const blocks = normalizeBlockEntries(raw);
  if (!blocks.length) {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return [];
    }

    const groups: SkillGroup[] = [];
    let currentCategory = "";
    let currentItems: string[] = [];

    for (const line of lines) {
      if (!currentCategory) {
        currentCategory = line;
        continue;
      }

      if (line.endsWith(":") || /^[A-Za-z][A-Za-z\s&/]+$/.test(line) && line.split(" ").length <= 4) {
        if (currentItems.length) {
          groups.push({ category: currentCategory, items: dedupeStringsCaseInsensitive(currentItems) });
        }
        currentCategory = line.replace(/:$/, "");
        currentItems = [];
        continue;
      }

      currentItems.push(line);
    }

    if (currentCategory && currentItems.length) {
      groups.push({ category: currentCategory, items: dedupeStringsCaseInsensitive(currentItems) });
    }

    return groups;
  }

  return blocks.map((block, index) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const category = lines[0]?.replace(/:$/, "") ?? `Category ${index + 1}`;
    const items = dedupeStringsCaseInsensitive(lines.slice(1));

    return { category, items };
  }).filter((group) => group.items.length > 0);
}

export function formatSkillGroups(skillGroups: ResumeContent["skillGroups"]) {
  return skillGroups
    .map((group) => [group.category, ...group.items].join("\n"))
    .join("\n\n");
}

export function parseCertificationBlocks(raw: string) {
  return normalizeBlockEntries(raw).map((block, index) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      id: `cert-${index + 1}`,
      name: readLabeledLine(lines, "Name") || lines[0] || "",
      issuer: readLabeledLine(lines, "Issuer"),
      date: readLabeledLine(lines, "Date") || lines[1] || "",
    };
  }).filter((entry) => entry.name);
}

export function formatCertificationBlocks(certifications: ResumeContent["certifications"]) {
  return certifications
    .map((cert) =>
      [
        `Name: ${cert.name}`,
        cert.issuer ? `Issuer: ${cert.issuer}` : "",
        cert.date ? `Date: ${cert.date}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

export function parseExperienceBlocks(raw: string) {
  return normalizeBlockEntries(raw).map((block, index) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const bullets = lines
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-+\s*/, "").trim())
      .filter(Boolean);

    return {
      id: `exp-${index + 1}`,
      company: readLabeledLine(lines, "Company"),
      title: readLabeledLine(lines, "Title"),
      location: readLabeledLine(lines, "Location"),
      startDate: readLabeledLine(lines, "Start"),
      endDate: readLabeledLine(lines, "End"),
      bullets,
    };
  });
}

export function parseEducationBlocks(raw: string) {
  return normalizeBlockEntries(raw).map((block, index) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const highlights = lines
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-+\s*/, "").trim())
      .filter(Boolean);

    return {
      id: `edu-${index + 1}`,
      school: readLabeledLine(lines, "School"),
      degree: readLabeledLine(lines, "Degree"),
      location: readLabeledLine(lines, "Location"),
      graduationDate: readLabeledLine(lines, "Graduation"),
      highlights,
    };
  });
}

export function parseProjectBlocks(raw: string) {
  return normalizeBlockEntries(raw).map((block, index) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const bullets = lines
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-+\s*/, "").trim())
      .filter(Boolean);

    return {
      id: `project-${index + 1}`,
      name: readLabeledLine(lines, "Name"),
      role: readLabeledLine(lines, "Role"),
      url: readLabeledLine(lines, "Url"),
      bullets,
    };
  });
}

export function resumeContentFromFormData(formData: FormData) {
  return normalizeResumeContent({
    title: String(formData.get("title") ?? ""),
    personal: {
      fullName: String(formData.get("fullName") ?? ""),
      headline: String(formData.get("headline") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      location: String(formData.get("location") ?? ""),
      linkedin: String(formData.get("linkedin") ?? ""),
      github: String(formData.get("github") ?? ""),
      portfolio: String(formData.get("portfolio") ?? ""),
    },
    summary: String(formData.get("summary") ?? ""),
    skillGroups: parseSkillGroups(String(formData.get("skillGroups") ?? "")),
    experiences: parseExperienceBlocks(String(formData.get("experiences") ?? "")),
    education: parseEducationBlocks(String(formData.get("education") ?? "")),
    certifications: parseCertificationBlocks(String(formData.get("certifications") ?? "")),
    projects: parseProjectBlocks(String(formData.get("projects") ?? "")),
  });
}

export function formatExperienceBlocks(experiences: ResumeContent["experiences"]) {
  return experiences
    .map(
      (experience) =>
        [
          `Company: ${experience.company}`,
          `Title: ${experience.title}`,
          `Location: ${experience.location}`,
          `Start: ${experience.startDate}`,
          `End: ${experience.endDate}`,
          ...experience.bullets.map((bullet) => `- ${bullet}`),
        ].join("\n"),
    )
    .join("\n\n");
}

export function formatEducationBlocks(education: ResumeContent["education"]) {
  return education
    .map(
      (entry) =>
        [
          `School: ${entry.school}`,
          `Degree: ${entry.degree}`,
          `Location: ${entry.location}`,
          `Graduation: ${entry.graduationDate}`,
          ...entry.highlights.map((highlight) => `- ${highlight}`),
        ].join("\n"),
    )
    .join("\n\n");
}

export function formatProjectBlocks(projects: ResumeContent["projects"]) {
  return projects
    .map((project) =>
      [
        `Name: ${project.name}`,
        project.role ? `Role: ${project.role}` : "",
        project.url ? `Url: ${project.url}` : "",
        ...project.bullets.map((bullet) => `- ${bullet}`),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

export function createEmptyResume(userId: string, email: string, name: string): BaseResume {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    content: {
      title: "Base Resume",
      personal: {
        fullName: name,
        headline: "",
        email,
        phone: "+1 (555) 010-0101",
        location: "Remote",
        linkedin: "",
        github: "",
        portfolio: "",
      },
      summary:
        "Adaptable professional with experience shipping cross-functional work, improving customer outcomes, and translating complex priorities into measurable results.",
      skillGroups: [
        {
          category: "Core skills",
          items: [
            "Stakeholder management",
            "Project delivery",
            "Process improvement",
            "Communication",
            "Data analysis",
          ],
        },
      ],
      experiences: [
        {
          id: "exp-1",
          company: "Example Company",
          title: "Operations Specialist",
          location: "Remote",
          startDate: "2022",
          endDate: "Present",
          bullets: [
            "Led process improvements that reduced turnaround time by 28% across a core workflow.",
            "Partnered with product, operations, and customer-facing teams to prioritize high-impact work.",
            "Tracked weekly metrics and shared recommendations with leadership to improve outcomes.",
          ],
        },
      ],
      education: [
        {
          id: "edu-1",
          school: "Example University",
          degree: "B.S. in Business Administration",
          location: "Remote",
          graduationDate: "2021",
          highlights: ["Graduated with honors"],
        },
      ],
      certifications: [],
      projects: [],
    },
  };
}
