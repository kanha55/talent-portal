import type { ResumeContent } from "@/lib/resume/schema";

export function flattenSkillItems(resume: ResumeContent) {
  return resume.skillGroups.flatMap((group) => group.items);
}

export function formatContactLines(resume: ResumeContent) {
  const { personal } = resume;
  return [
    personal.email,
    personal.phone,
    personal.location,
    personal.linkedin,
    personal.github,
    personal.portfolio,
  ].filter(Boolean);
}

export function formatExperienceDateRange(experience: ResumeContent["experiences"][number]) {
  return `${experience.startDate} – ${experience.endDate}`;
}

export function formatExperienceTitleLine(experience: ResumeContent["experiences"][number]) {
  return [experience.title, experience.location].filter(Boolean).join(" · ");
}

export function formatEducationDateRange(entry: ResumeContent["education"][number]) {
  return entry.graduationDate;
}

export function formatEducationDegreeLine(entry: ResumeContent["education"][number]) {
  return [entry.degree, ...entry.highlights].filter(Boolean).join(" · ");
}
