import type { AtsReport, ResumeContent, TailoredResumeVersion, TargetJob } from "@/lib/resume/schema";
import { flattenSkillItems } from "@/lib/resume/sectionContent";
import {
  hasTableLikeFormatting,
  hasTextBoxArtifacts,
  sanitizeText,
} from "@/lib/resume/sanitizeContent";

function normalize(value: string) {
  return value.toLowerCase();
}

const ACTION_VERB_PATTERN =
  /^(led|built|reduced|increased|architected|automated|developed|created|managed|designed|implemented|optimized|streamlined|delivered|partnered|drove|spearheaded|launched|improved)\b/i;

function hasQuantifiedMetric(text: string) {
  return /\d+%?|\d+k\b|\d+\s*(min|sec|users|engineers|events)/i.test(text);
}

function resumeText(resume: ResumeContent) {
  return [
    resume.summary,
    flattenSkillItems(resume).join(" "),
    ...resume.experiences.flatMap((entry) => [entry.company, entry.title, ...entry.bullets]),
    ...resume.education.flatMap((entry) => [entry.school, entry.degree, ...entry.highlights]),
    ...resume.certifications.map((entry) => entry.name),
    ...resume.projects.flatMap((entry) => [entry.name, entry.role, ...entry.bullets]),
  ]
    .join(" ")
    .toLowerCase();
}

export function compareResumeDiff(baseResume: ResumeContent, tailoredResume: ResumeContent) {
  const changes: string[] = [];

  if (baseResume.summary !== tailoredResume.summary) {
    changes.push("Summary was rewritten to better align with the target role.");
  }

  const baseSkills = flattenSkillItems(baseResume).join(", ");
  const tailoredSkills = flattenSkillItems(tailoredResume).join(", ");
  if (baseSkills !== tailoredSkills) {
    changes.push("Skills were reordered to mirror the job description keywords.");
  }

  if (
    JSON.stringify(baseResume.experiences.map((experience) => experience.bullets)) !==
    JSON.stringify(tailoredResume.experiences.map((experience) => experience.bullets))
  ) {
    changes.push("Experience bullets were prioritized and rewritten for ATS keyword alignment.");
  }

  if (changes.length === 0) {
    changes.push("Formatting and structure were preserved to stay ATS-safe.");
  }

  return changes;
}

export function generateAtsReport(input: {
  userId: string;
  versionId: string;
  baseResume: ResumeContent;
  tailoredResume: ResumeContent;
  targetJob: TargetJob;
}): Omit<AtsReport, "id" | "createdAt"> {
  const text = resumeText(input.tailoredResume);
  const matchedKeywords = input.targetJob.keywords.filter((keyword) =>
    text.includes(normalize(keyword)),
  );
  const missingKeywords = input.targetJob.keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );

  const missingSections: string[] = [];
  if (!input.tailoredResume.summary.trim()) {
    missingSections.push("summary");
  }
  if (flattenSkillItems(input.tailoredResume).length === 0) {
    missingSections.push("skills");
  }
  if (input.tailoredResume.experiences.length === 0) {
    missingSections.push("experience");
  }
  if (input.tailoredResume.education.length === 0) {
    missingSections.push("education");
  }

  const warnings: string[] = [];
  const overlongBullets = input.tailoredResume.experiences.flatMap((experience) =>
    experience.bullets.filter((bullet) => bullet.split(/\s+/).length > 30),
  );
  if (overlongBullets.length > 0) {
    warnings.push("Some experience bullets are long and may be hard for recruiters to scan.");
  }

  const weakBullets = input.tailoredResume.experiences.flatMap((experience) => experience.bullets).filter(
    (bullet) => !ACTION_VERB_PATTERN.test(bullet) || !hasQuantifiedMetric(bullet),
  );
  if (weakBullets.length > 0) {
    warnings.push(
      "Some bullets do not follow action verb → metric → impact. Strengthen them with quantified outcomes.",
    );
  }

  const repeatedBullets = new Set<string>();
  for (const bullet of input.tailoredResume.experiences.flatMap((experience) => experience.bullets)) {
    const fingerprint = bullet.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
    if (repeatedBullets.has(fingerprint)) {
      warnings.push("Several bullets start the same way; vary phrasing to avoid repetition.");
      break;
    }
    repeatedBullets.add(fingerprint);
  }

  if (input.tailoredResume.summary.length > 320) {
    warnings.push("The professional summary is long; shorten it to 2-3 lines for ATS readability.");
  }

  const rawResumeText = [
    input.tailoredResume.summary,
    ...input.tailoredResume.experiences.flatMap((entry) => entry.bullets),
  ].join("\n");

  if (hasTableLikeFormatting(rawResumeText)) {
    warnings.push("Resume text may contain table-like formatting. Use a single-column plain text layout.");
  }

  if (hasTextBoxArtifacts(rawResumeText)) {
    warnings.push("Resume text may contain text box artifacts. Paste plain text only.");
  }

  const keywordCoverage =
    input.targetJob.keywords.length === 0
      ? 100
      : Math.round((matchedKeywords.length / input.targetJob.keywords.length) * 100);

  const baseScore = 55;
  const overallScore = Math.max(
    35,
    Math.min(
      100,
      baseScore +
        Math.round(keywordCoverage * 0.35) +
        (missingSections.length === 0 ? 10 : -missingSections.length * 5) -
        warnings.length * 4,
    ),
  );

  return {
    userId: input.userId,
    resumeVersionId: input.versionId,
    overallScore,
    keywordCoverage,
    matchedKeywords,
    missingKeywords,
    missingSections,
    warnings,
    diffHighlights: compareResumeDiff(input.baseResume, input.tailoredResume),
  };
}

export function summarizeTailoring(version: TailoredResumeVersion, report: AtsReport) {
  return {
    title: version.title,
    scoreLabel:
      report.overallScore >= 85
        ? "Strong ATS alignment"
        : report.overallScore >= 70
          ? "Good ATS alignment"
          : "Needs refinement",
  };
}

export function sanitizeResumeFields(resume: ResumeContent): ResumeContent {
  return {
    ...resume,
    summary: sanitizeText(resume.summary),
    experiences: resume.experiences.map((experience) => ({
      ...experience,
      bullets: experience.bullets.map((bullet) => sanitizeText(bullet)),
    })),
    education: resume.education.map((entry) => ({
      ...entry,
      highlights: entry.highlights.map((highlight) => sanitizeText(highlight)),
    })),
    skillGroups: resume.skillGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => sanitizeText(item)),
    })),
    certifications: resume.certifications.map((cert) => ({
      ...cert,
      name: sanitizeText(cert.name),
      issuer: sanitizeText(cert.issuer),
    })),
  };
}
