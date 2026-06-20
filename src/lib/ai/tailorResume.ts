import { generateProfessionalSummary } from "@/lib/ai/generateProfessionalSummary";
import { callOpenAiJsonChat } from "@/lib/ai/openaiClient";
import { buildTailorResumePrompt } from "@/lib/ai/prompts/tailorResume";
import {
  extractTechKeywords,
  isArtifactSkill,
  isGarbageJobRole,
} from "@/lib/jobs/cleanJobDescription";
import { cleanJobRole } from "@/lib/jobs/parseJobDescription";
import { sanitizeResumeFields } from "@/lib/resume/atsChecks";
import { flattenSkillItems } from "@/lib/resume/sectionContent";
import {
  dedupeStringsCaseInsensitive,
  normalizeResumeContent,
  type ResumeContent,
  type SkillGroup,
  type TargetJob,
} from "@/lib/resume/schema";

type TailorResult = {
  resume: ResumeContent;
  changeSummary: string[];
  usedModel: string;
};

function keywordOverlapScore(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.reduce(
    (score, keyword) => score + (lower.includes(keyword.toLowerCase()) ? 2 : 0),
    0,
  );
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupeCaseInsensitive(values: string[]) {
  return dedupeStringsCaseInsensitive(values);
}

function sentenceCase(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function prioritizeList(items: string[], keywords: string[], limit: number) {
  return [...items]
    .sort((a, b) => {
      const byScore = keywordOverlapScore(b, keywords) - keywordOverlapScore(a, keywords);
      if (byScore !== 0) {
        return byScore;
      }

      return a.localeCompare(b);
    })
    .slice(0, limit);
}

function compactBullet(bullet: string) {
  return bullet.replace(/\s+/g, " ").trim().replace(/[;,.]+$/, "");
}

function strongestResumeBullets(baseResume: ResumeContent, targetJob: TargetJob, limit: number) {
  return prioritizeList(
    baseResume.experiences
      .flatMap((experience) => experience.bullets)
      .map(compactBullet)
      .filter(Boolean),
    [...targetJob.keywords, ...targetJob.responsibilities],
    limit,
  );
}

function bulletToImpactPhrase(bullet: string) {
  return bullet
    .replace(/^[A-Z]/, (char) => char.toLowerCase())
    .replace(/[.!?]+$/, "")
    .replace(/^led\s+/i, "leading ")
    .replace(/^managed\s+/i, "managing ")
    .replace(/^built\s+/i, "building ")
    .replace(/^developed\s+/i, "developing ")
    .replace(/^created\s+/i, "creating ")
    .replace(/^partnered\s+/i, "partnering ")
    .replace(/^drove\s+/i, "driving ");
}

function selectBullets(bullets: string[], targetJob: TargetJob, limit: number) {
  const prioritized = prioritizeList(
    bullets.map(compactBullet).filter(Boolean),
    [...targetJob.keywords, ...targetJob.responsibilities],
    limit,
  );

  return prioritized.map((bullet) => (/[.!?]$/.test(bullet) ? bullet : `${bullet}.`));
}

function experienceSortScore(experience: ResumeContent["experiences"][number]) {
  const endScore = /present|current/i.test(experience.endDate) ? 1000 : 0;
  const startYear = Number.parseInt(experience.startDate.match(/\d{4}/)?.[0] ?? "0", 10);
  return endScore + startYear;
}

function prioritizeSkillGroups(baseResume: ResumeContent, targetJob: TargetJob): SkillGroup[] {
  const keywords = [...targetJob.keywords, ...targetJob.responsibilities];

  return [...baseResume.skillGroups]
    .map((group) => ({
      category: group.category,
      items: dedupeCaseInsensitive(prioritizeList(group.items, keywords, 10)),
    }))
    .sort(
      (a, b) =>
        keywordOverlapScore(b.items.join(" "), keywords) -
        keywordOverlapScore(a.items.join(" "), keywords),
    );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function baseResumeCorpus(baseResume: ResumeContent) {
  return [
    baseResume.summary,
    flattenSkillItems(baseResume).join(" "),
    ...baseResume.experiences.flatMap((experience) => [
      experience.title,
      experience.company,
      ...experience.bullets,
    ]),
    ...baseResume.education.flatMap((entry) => [entry.school, entry.degree, ...entry.highlights]),
    ...baseResume.certifications.map((entry) => entry.name),
  ]
    .join(" ")
    .toLowerCase();
}

function stripEmployerReferences(text: string, targetJob: TargetJob) {
  let result = text.trim();
  if (!result) {
    return result;
  }

  const company = targetJob.company.trim();
  if (company && company.toLowerCase() !== "target company") {
    result = result.replace(new RegExp(escapeRegExp(company), "gi"), "");
  }

  result = result
    .replace(/\baligned with\b[^.!?]*/gi, "")
    .replace(/\bapplying to\b[^.!?]*/gi, "")
    .replace(/\bat\s+[A-Z][A-Za-z0-9&.\s-]+(?:priorities|expectations)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();

  return result;
}

function resolveTargetRole(baseResume: ResumeContent, targetJob: TargetJob) {
  const cleaned = cleanJobRole(targetJob.role, targetJob.company);
  if (!isGarbageJobRole(cleaned)) {
    return cleaned;
  }

  if (baseResume.personal.headline?.trim()) {
    return baseResume.personal.headline.trim();
  }

  const experienceTitle = baseResume.experiences[0]?.title;
  if (experienceTitle) {
    return experienceTitle.split(",")[0]?.trim() ?? experienceTitle;
  }

  return "Software Engineer";
}

function categorizeSkills(skills: string[]) {
  const languageHints = [
    "javascript",
    "typescript",
    "python",
    "java",
    "ruby",
    "go",
    "rust",
    "php",
    "sql",
    "html",
    "css",
  ];
  const langItems: string[] = [];
  const toolItems: string[] = [];

  for (const skill of skills) {
    if (isArtifactSkill(skill)) {
      continue;
    }

    const lower = skill.toLowerCase();
    if (languageHints.some((hint) => lower.includes(hint))) {
      langItems.push(skill);
    } else {
      toolItems.push(skill);
    }
  }

  const groups: SkillGroup[] = [];
  if (langItems.length) {
    groups.push({ category: "Languages", items: langItems });
  }
  if (toolItems.length) {
    groups.push({ category: "Frameworks & tools", items: toolItems });
  }

  if (!groups.length) {
    return [{ category: "Skills", items: skills.filter((skill) => !isArtifactSkill(skill)) }];
  }

  return groups;
}

function rebuildSkillGroupsForJd(
  baseResume: ResumeContent,
  targetJob: TargetJob,
  groups: SkillGroup[],
) {
  const corpus = baseResumeCorpus(baseResume);
  const baseItems = dedupeCaseInsensitive(
    groups.flatMap((group) => group.items).filter((skill) => !isArtifactSkill(skill)),
  );
  const jdTech = extractTechKeywords(targetJob.description);
  const supportedJd = jdTech.filter(
    (tech) =>
      corpus.includes(tech.toLowerCase()) ||
      baseItems.some((item) => item.toLowerCase().includes(tech.toLowerCase())),
  );

  const prioritized = dedupeCaseInsensitive(
    prioritizeList([...supportedJd, ...baseItems], targetJob.keywords, 20),
  );

  return categorizeSkills(prioritized);
}

function polishGeneralResume(
  resume: ResumeContent,
  baseResume: ResumeContent,
  targetJob: TargetJob,
): ResumeContent {
  const role = resolveTargetRole(baseResume, targetJob);

  return {
    ...resume,
    summary: stripEmployerReferences(resume.summary, targetJob),
    personal: {
      ...resume.personal,
      headline: role,
    },
    skillGroups: rebuildSkillGroupsForJd(baseResume, targetJob, resume.skillGroups),
    experiences: resume.experiences.map((experience) => ({
      ...experience,
      bullets: experience.bullets
        .map((bullet) => stripEmployerReferences(bullet, targetJob))
        .filter(Boolean),
    })),
  };
}

function heuristicSummary(baseResume: ResumeContent, targetJob: TargetJob) {
  const role = resolveTargetRole(baseResume, targetJob);
  const topSkills = prioritizeList(flattenSkillItems(baseResume), targetJob.keywords, 6);
  const strongestBaseSentence =
    prioritizeList(splitSentences(baseResume.summary), targetJob.keywords, 1)[0] ?? "";
  const impactBullets = strongestResumeBullets(baseResume, targetJob, 2);

  const stackPhrase = topSkills.slice(0, 4).join(", ");
  const firstSentence = sentenceCase(
    `${role} with experience building scalable applications using ${stackPhrase}`,
  );
  const secondSentence =
    impactBullets.length >= 2
      ? sentenceCase(
          `Proven track record of ${bulletToImpactPhrase(impactBullets[0])} and ${bulletToImpactPhrase(impactBullets[1])}`,
        )
      : strongestBaseSentence
        ? sentenceCase(strongestBaseSentence)
        : "";
  const jdTech = extractTechKeywords(targetJob.description).slice(0, 3);
  const thirdSentence =
    jdTech.length >= 2
      ? sentenceCase(`Experienced with ${jdTech.join(", ")}`)
      : targetJob.keywords.length >= 2
        ? sentenceCase(`Experienced with ${targetJob.keywords.slice(0, 3).join(", ")}`)
        : "";

  return stripEmployerReferences(
    [firstSentence, secondSentence, thirdSentence].filter(Boolean).join(" "),
    targetJob,
  );
}

function finalizeTailoredResume(
  baseResume: ResumeContent,
  targetJob: TargetJob,
  partial: Partial<ResumeContent>,
): ResumeContent {
  const role = resolveTargetRole(baseResume, targetJob);
  const merged = normalizeResumeContent(
    sanitizeResumeFields({
      ...baseResume,
      ...partial,
      title: baseResume.title,
      personal: {
        ...baseResume.personal,
        ...partial.personal,
        headline: role,
      },
    }),
  );

  return polishGeneralResume(merged, baseResume, targetJob);
}

function heuristicTailor(baseResume: ResumeContent, targetJob: TargetJob): TailorResult {
  const prioritizedExperiences = [...baseResume.experiences]
    .map((experience) => ({
      ...experience,
      bullets: selectBullets(experience.bullets, targetJob, 3),
    }))
    .sort((a, b) => experienceSortScore(b) - experienceSortScore(a));

  return {
    resume: finalizeTailoredResume(baseResume, targetJob, {
      summary: heuristicSummary(baseResume, targetJob),
      skillGroups: rebuildSkillGroupsForJd(
        baseResume,
        targetJob,
        prioritizeSkillGroups(baseResume, targetJob),
      ),
      experiences: prioritizedExperiences,
      projects: [],
    }),
    changeSummary: [
      "Rewrote the professional summary as a general, keyword-rich 2-3 line overview.",
      "Reordered work experience reverse-chronologically and prioritized high-signal bullets.",
      "Grouped and prioritized skills to match job description keywords without naming the employer.",
    ],
    usedModel: "heuristic-fallback",
  };
}

function mergeResponseIntoResume(
  baseResume: ResumeContent,
  targetJob: TargetJob,
  parsed: {
    summary?: string;
    headline?: string;
    skillGroups?: SkillGroup[];
    experiences?: { id: string; bullets: string[] }[];
    changeSummary?: string[];
  },
): TailorResult {
  const experiencesById = new Map(
    parsed.experiences?.map((entry) => [entry.id, entry.bullets]) ?? [],
  );

  const mergedExperiences = baseResume.experiences
    .map((experience) => ({
      ...experience,
      bullets: experiencesById.get(experience.id)?.filter(Boolean).length
        ? (experiencesById.get(experience.id) as string[])
        : experience.bullets,
    }))
    .sort((a, b) => experienceSortScore(b) - experienceSortScore(a));

  const skillGroups =
    parsed.skillGroups?.filter((group) => group.items?.length).length
      ? rebuildSkillGroupsForJd(
          baseResume,
          targetJob,
          parsed.skillGroups.map((group) => ({
            category: group.category,
            items: dedupeStringsCaseInsensitive(group.items.filter(Boolean)),
          })),
        )
      : rebuildSkillGroupsForJd(baseResume, targetJob, prioritizeSkillGroups(baseResume, targetJob));

  return {
    resume: finalizeTailoredResume(baseResume, targetJob, {
      summary: stripEmployerReferences(parsed.summary?.trim() || baseResume.summary, targetJob),
      personal: {
        ...baseResume.personal,
        headline: resolveTargetRole(baseResume, targetJob),
      },
      skillGroups,
      experiences: mergedExperiences,
      projects: [],
    }),
    changeSummary:
      parsed.changeSummary?.filter(Boolean).length ? parsed.changeSummary.filter(Boolean) : [],
    usedModel: "openai-compatible",
  };
}

type TailorLlmPayload = {
  summary?: string;
  headline?: string;
  skillGroups?: SkillGroup[];
  experiences?: { id: string; bullets: string[] }[];
  changeSummary?: string[];
};

async function callOpenAiCompatible(baseResume: ResumeContent, targetJob: TargetJob) {
  return callOpenAiJsonChat<TailorLlmPayload>({
    system:
      "You tailor resumes for ATS systems while preserving factual accuracy and returning JSON.",
    user: buildTailorResumePrompt(baseResume, targetJob),
    temperature: 0.3,
  });
}

function formatAiWarning(message: string) {
  return `AI unavailable: ${message}`;
}

function addUniqueChangeSummaryItem(items: string[], item: string) {
  if (!items.includes(item)) {
    items.unshift(item);
  }
}

function wantsFullTailorLlm() {
  return process.env.OPENAI_FULL_TAILOR === "true";
}

export async function tailorResume(baseResume: ResumeContent, targetJob: TargetJob) {
  const normalizedBase = normalizeResumeContent(baseResume);

  const applyLlmSummary = async (result: TailorResult): Promise<TailorResult> => {
    const llmSummary = await generateProfessionalSummary(normalizedBase, targetJob);
    if (llmSummary.summary) {
      result.resume.summary = stripEmployerReferences(llmSummary.summary, targetJob);
      result.usedModel = llmSummary.model ?? result.usedModel;
      if (!result.changeSummary.some((item) => /professional summary/i.test(item))) {
        result.changeSummary.unshift(
          "Generated a 2-3 line professional summary with AI from the full candidate profile.",
        );
      }
      return result;
    }

    if (llmSummary.error) {
      addUniqueChangeSummaryItem(result.changeSummary, formatAiWarning(llmSummary.error));
      result.usedModel = "heuristic-fallback";
    }

    return result;
  };

  if (!wantsFullTailorLlm()) {
    return applyLlmSummary(heuristicTailor(normalizedBase, targetJob));
  }

  const llmResult = await callOpenAiCompatible(normalizedBase, targetJob);
  if (!llmResult.ok) {
    const heuristic = heuristicTailor(normalizedBase, targetJob);
    addUniqueChangeSummaryItem(heuristic.changeSummary, formatAiWarning(llmResult.error));
    return applyLlmSummary(heuristic);
  }

  const merged = mergeResponseIntoResume(normalizedBase, targetJob, llmResult.data);
  merged.usedModel = llmResult.model;
  if (!merged.changeSummary.length) {
    merged.changeSummary = heuristicTailor(normalizedBase, targetJob).changeSummary;
  }

  const tailoredSummary = merged.resume.summary.trim();
  const baseSummary = normalizedBase.summary.trim();
  if (
    tailoredSummary &&
    tailoredSummary !== baseSummary &&
    tailoredSummary.length >= 20 &&
    !merged.changeSummary.some((item) => /professional summary/i.test(item))
  ) {
    merged.changeSummary.unshift(
      "Generated a 2-3 line professional summary with AI from the full candidate profile.",
    );
    return merged;
  }

  return applyLlmSummary(merged);
}
