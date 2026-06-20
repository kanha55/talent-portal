import type { ResumeContent, TargetJob } from "@/lib/resume/schema";

export function buildTailorResumePrompt(baseResume: ResumeContent, targetJob: TargetJob) {
  return `
You are tailoring a general-purpose resume for ATS compatibility using a single-column, plain-text format.

Important:
- Produce a GENERAL resume for the candidate, not a cover letter.
- NEVER mention the target employer company name anywhere in summary, headline, bullets, or skills.
- Do NOT write "aligned with", "applying to", "at [Company]", or similar application-specific phrasing.
- Use the job description ONLY to select keywords, reorder skills, and lightly rewrite bullets the candidate already supports.
- Headline should be the target role title only (e.g. "Senior Software Engineer"), not a job posting title.

ATS rules (enforce strictly):
- Use standard section headings only: Professional summary, Work experience, Education, Skills, Certifications.
- Single-column plain text. No tables, columns, text boxes, images, icons, or fancy formatting.
- Summary: 2-3 lines, keyword-rich, grounded in the candidate's real experience (like a strong general resume).
- Experience bullets: action verb → quantified metric → business impact. Do not invent metrics.
- Skills: group by category and prioritize terms that appear in the job description when the candidate actually has them.
- Preserve factual accuracy. Do not invent employers, dates, tools, results, education, or certifications.

Section order for the tailored output:
1. Contact info (preserve personal details)
2. Professional summary
3. Work experience (reverse chronological — most recent first)
4. Education
5. Skills (keyword-rich, grouped)
6. Certifications (optional, only if present in base resume)

Return valid JSON only with this shape:
{
  "summary": "string",
  "headline": "string",
  "skillGroups": [{"category":"string","items":["string"]}],
  "experiences": [{"id":"string","bullets":["string"]}],
  "changeSummary": ["string"]
}

Target role (for keyword alignment only — do not name the employer in output):
${targetJob.role}

Job description (use for keywords only):
${targetJob.description}

Target keywords to weave in when supported by the base resume:
${targetJob.keywords.join(", ")}

Target responsibilities (context only):
${targetJob.responsibilities.join("\n")}

Base resume:
${JSON.stringify(baseResume, null, 2)}
  `.trim();
}
