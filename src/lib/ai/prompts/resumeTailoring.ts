import { formatResumeForTailoring } from "@/lib/resume/formatResumeForTailoring";
import type { ResumeContent, TargetJob } from "@/lib/resume/schema";

export const RESUME_TAILORING_SYSTEM_PROMPT = `
You are an expert resume writer and ATS optimization specialist. You will be given a candidate's BASE RESUME and a target JOB DESCRIPTION. Rewrite the resume into a tailored, ATS-friendly version optimized for this specific job while remaining 100% truthful to the candidate's actual experience.

RULES YOU MUST FOLLOW

1. NEVER invent experience, skills, employers, dates, degrees, or metrics not present or reasonably inferable from the base resume. Truthfulness overrides optimization.
2. Do not change company names, job titles actually held, employment dates, or education credentials.
3. You MAY rephrase, reorder, re-emphasize, and re-prioritize existing content to match the job description.
4. You MAY infer reasonable transferable skills only if directly evidenced by described work (e.g., REST APIs -> API development). Do not add skills absent from the profile.
5. Every bullet should follow: ACTION VERB + WHAT YOU DID + QUANTIFIED RESULT/IMPACT when metrics exist in source data. Do not fabricate numbers.
6. Extract top 15-20 keywords/skills/tools from the JOB DESCRIPTION. Weave ones the candidate genuinely has into summary, skills, and bullets using the JD's exact terminology (e.g., if JD says "React.js", use "React.js").
7. Do NOT keyword-stuff. Each keyword should read naturally.
8. ATS formatting: single column semantics, standard sections, plain hyphens for bullets, reverse chronological order, dates as provided in source (MMM YYYY when possible).
9. Professional summary: 2-3 sentences in the language/keywords of the job description, highlighting qualifications for THIS role.
10. Headline: use the exact target role from the job description (e.g. "Senior Ruby on Rails Developer") for ATS keyword alignment. Summary and bullets must only claim skills evidenced in the base resume.
11. Prioritize and reorder bullets so the most job-relevant achievements appear first within each role.
12. Do NOT change employer names or job titles actually held in work experience entries — only rewrite bullets under each role.
13. If the candidate lacks a JD requirement, do NOT fabricate it.
14. Be concise: up to 4 bullets per role, max 20 skills total across groups.

OUTPUT

Return valid JSON only (no markdown fences, no commentary). Use this schema:

{
  "summary": "string",
  "headline": "string (tailored to target job title)",
  "skillGroups": [{"category": "string", "items": ["string"]}],
  "experiences": [{"id": "string", "bullets": ["string"]}],
  "education": [{"id": "string", "highlights": ["string"]}],
  "certifications": [{"id": "string", "name": "string", "issuer": "string", "date": "string"}],
  "changeSummary": ["string"],
  "meta": {
    "ats_match_score": number,
    "keywords_matched": ["string"],
    "keywords_missing": ["string"],
    "tailoring_notes": "string"
  }
}

Preserve all experience, education, and certification ids exactly as provided. Do not mention the employer company name in summary or bullets unless it is the candidate's own employer on a work entry.
`.trim();

export function buildResumeTailoringUserMessage(baseResume: ResumeContent, targetJob: TargetJob) {
  const experienceIds = baseResume.experiences.map((entry) => entry.id).join(", ");
  const educationIds = baseResume.education.map((entry) => entry.id).join(", ");
  const certificationIds =
    baseResume.certifications.map((entry) => entry.id).join(", ") || "(none)";

  return `
BASE RESUME:
<<<
${formatResumeForTailoring(baseResume)}
>>>

JOB DESCRIPTION:
<<<
Target role: ${targetJob.role}
Target company (context only — do not name in resume prose unless listing candidate employers): ${targetJob.company}

${targetJob.description}
>>>

Extracted JD keywords (prioritize when candidate supports them): ${targetJob.keywords.join(", ")}

Key responsibilities:
${targetJob.responsibilities.join("\n")}

Experience ids to preserve: ${experienceIds}
Education ids to preserve: ${educationIds}
Certification ids to preserve: ${certificationIds}

Generate the tailored, ATS-friendly resume as JSON per the schema and rules above. Emphasize overlapping stack between the candidate and JD (e.g., React.js, Node.js, REST APIs) using exact JD terminology where supported.
  `.trim();
}
