import type { ResumeContent, TargetJob } from "@/lib/resume/schema";
import { flattenSkillItems } from "@/lib/resume/sectionContent";

export function buildCandidateProfileForSummary(resume: ResumeContent) {
  return {
    contact: {
      fullName: resume.personal.fullName,
      headline: resume.personal.headline,
      email: resume.personal.email,
      phone: resume.personal.phone,
      location: resume.personal.location,
      linkedin: resume.personal.linkedin,
      github: resume.personal.github,
      portfolio: resume.personal.portfolio,
    },
    currentSummary: resume.summary,
    workExperience: resume.experiences.map((experience) => ({
      company: experience.company,
      title: experience.title,
      location: experience.location,
      startDate: experience.startDate,
      endDate: experience.endDate,
      bullets: experience.bullets,
    })),
    education: resume.education.map((entry) => ({
      school: entry.school,
      degree: entry.degree,
      graduationDate: entry.graduationDate,
      highlights: entry.highlights,
    })),
    skillGroups: resume.skillGroups,
    certifications: resume.certifications,
    allSkills: flattenSkillItems(resume),
  };
}

export function buildGenerateSummaryPrompt(baseResume: ResumeContent, targetJob?: TargetJob) {
  const profile = buildCandidateProfileForSummary(baseResume);
  const role = targetJob?.role ?? baseResume.personal.headline ?? "Software Engineer";
  const keywords = targetJob?.keywords ?? [];
  const responsibilities = targetJob?.responsibilities ?? [];

  return `
Write a professional resume summary for ATS using ONLY the candidate facts below.

Output rules:
- Exactly 2-3 complete sentences (not bullet points).
- 45-90 words total.
- Keyword-rich and confident, like a strong general resume (not a cover letter).
- NEVER mention any target employer company name.
- Do NOT use phrases like "aligned with", "applying to", or "seeking opportunities at".
- Include years of experience, core stack, and 1-2 quantified achievements ONLY if they appear in the candidate data.
- Do not invent employers, tools, metrics, degrees, or certifications.
- Mirror these job keywords only when the candidate profile supports them: ${keywords.join(", ")}

Target role for keyword alignment (do not name employers): ${role}

Job responsibilities context (keywords only, do not quote employers):
${responsibilities.join("\n")}

Candidate profile (use all relevant details):
${JSON.stringify(profile, null, 2)}

Return valid JSON only:
{
  "summary": "string"
}
  `.trim();
}
