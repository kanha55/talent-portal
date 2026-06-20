import { buildCandidateProfileForSummary } from "@/lib/ai/prompts/generateSummary";
import type { ResumeContent, TargetJob } from "@/lib/resume/schema";

export function buildGenerateResumeSectionsPrompt(
  baseResume: ResumeContent,
  targetJob?: TargetJob,
) {
  const profile = buildCandidateProfileForSummary(baseResume);
  const role = targetJob?.role ?? baseResume.personal.headline ?? "Software Engineer";
  const keywords = targetJob?.keywords ?? [];
  const responsibilities = targetJob?.responsibilities ?? [];

  const tailoringBlock = targetJob
    ? `
Tailoring context (keywords only — do not name the employer in output):
- Target role: ${role}
- Target employer (NEVER mention in output): ${targetJob.company}
- Job description keywords: ${keywords.join(", ")}
- Responsibilities context:
${responsibilities.join("\n")}

Job description (use for keywords only):
${targetJob.description}
`
    : `
General resume polish (no specific job posting):
- Target role for headline alignment: ${role}
`;

  return `
You generate ATS-friendly resume sections using ONLY the candidate facts below.

Rules:
- Produce a GENERAL resume for the candidate, not a cover letter.
- NEVER mention any target employer company name in summary, headline, bullets, skills, or education.
- Do NOT write "aligned with", "applying to", "at [Company]", or similar application-specific phrasing.
- Use standard ATS section semantics: Professional summary, Work experience, Education, Skills, Certifications.
- Single-column plain text. No tables, columns, icons, or decorative formatting.
- Preserve factual accuracy. Do not invent employers, dates, tools, metrics, degrees, schools, or certifications.
- Mirror job keywords only when the candidate profile supports them.

Section requirements:
1. Professional summary: exactly 2-3 complete sentences, 45-90 words, keyword-rich, grounded in real experience.
2. Headline: target role title only (e.g. "Senior Software Engineer"), not a job posting title.
3. Work experience: for EACH existing experience id, return up to 3 bullets. Format: action verb → quantified metric (only if in source data) → business impact. Order experiences reverse chronological (most recent first) in the JSON array.
4. Education: for EACH existing education id, return optional highlight bullets (coursework, honors, activities) only if supported by source data; use [] if none.
5. Skills: grouped by category, keyword-rich, prioritize terms from the job context when supported; max 12 skills total across all groups.
6. Certifications (optional): only entries that exist in the base resume — polish name/issuer/date wording, do not add new certifications.

${tailoringBlock}

Candidate profile:
${JSON.stringify(profile, null, 2)}

IDs to preserve exactly:
- Experience ids: ${baseResume.experiences.map((entry) => entry.id).join(", ")}
- Education ids: ${baseResume.education.map((entry) => entry.id).join(", ")}
- Certification ids: ${baseResume.certifications.map((entry) => entry.id).join(", ") || "(none)"}

Return valid JSON only:
{
  "summary": "string",
  "headline": "string",
  "experiences": [{"id": "string", "bullets": ["string"]}],
  "education": [{"id": "string", "highlights": ["string"]}],
  "skillGroups": [{"category": "string", "items": ["string"]}],
  "certifications": [{"id": "string", "name": "string", "issuer": "string", "date": "string"}],
  "changeSummary": ["string"]
}
  `.trim();
}
