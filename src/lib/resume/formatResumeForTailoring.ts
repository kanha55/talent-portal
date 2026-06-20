import {
  formatExperienceDateRange,
  formatExperienceTitleLine,
} from "@/lib/resume/sectionContent";
import type { ResumeContent } from "@/lib/resume/schema";

export function formatResumeForTailoring(resume: ResumeContent) {
  const { personal } = resume;
  const lines: string[] = [
    personal.fullName,
    personal.headline,
    personal.email,
    personal.phone,
    personal.location,
    personal.linkedin,
    personal.github,
    personal.portfolio,
    "",
    "PROFESSIONAL SUMMARY",
    resume.summary,
    "",
    "WORK EXPERIENCE",
  ];

  for (const experience of resume.experiences) {
    lines.push(
      `${experience.title} — ${experience.company}`,
      formatExperienceDateRange(experience),
      formatExperienceTitleLine(experience),
    );
    for (const bullet of experience.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
  }

  lines.push("EDUCATION");
  for (const entry of resume.education) {
    lines.push(entry.school, entry.degree, entry.graduationDate);
    for (const highlight of entry.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push("");
  }

  lines.push("SKILLS");
  for (const group of resume.skillGroups) {
    lines.push(`${group.category}: ${group.items.join(", ")}`);
  }

  if (resume.certifications.length) {
    lines.push("", "CERTIFICATIONS");
    for (const cert of resume.certifications) {
      lines.push(
        [cert.name, cert.issuer, cert.date].filter(Boolean).join(" · "),
      );
    }
  }

  if (resume.projects.length) {
    lines.push("", "PROJECTS");
    for (const project of resume.projects) {
      lines.push(project.name, project.role, project.url);
      for (const bullet of project.bullets) {
        lines.push(`- ${bullet}`);
      }
      lines.push("");
    }
  }

  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}
