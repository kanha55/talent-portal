import path from "node:path";
import { pathToFileURL } from "node:url";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import {
  dedupeStringsCaseInsensitive,
  normalizeResumeContent,
  parseSkillGroups,
  sanitizePersonalUrl,
  type ResumeContent,
} from "@/lib/resume/schema";
import { isArtifactSkill } from "@/lib/jobs/cleanJobDescription";
import { sanitizeText } from "@/lib/resume/sanitizeContent";

function coalescePersonalUrl(extracted: string | undefined, fallback: string) {
  if (extracted?.trim()) {
    return sanitizePersonalUrl(extracted);
  }

  return sanitizePersonalUrl(fallback);
}

const sectionAliases = new Map<string, keyof ParsedSections>([
  ["summary", "summary"],
  ["professional summary", "summary"],
  ["profile", "summary"],
  ["about", "summary"],
  ["skills", "skills"],
  ["technical skills", "skills"],
  ["core skills", "skills"],
  ["competencies", "skills"],
  ["certifications", "certifications"],
  ["certificates", "certifications"],
  ["licenses", "certifications"],
  ["licenses & certifications", "certifications"],
  ["experience", "experience"],
  ["work experience", "experience"],
  ["professional experience", "experience"],
  ["employment", "experience"],
  ["education", "education"],
  ["projects", "projects"],
  ["project experience", "projects"],
]);

const pdfWorkerUrl = pathToFileURL(
  path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).toString();

type ParsedSections = {
  summary: string[];
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  certifications: string[];
};

function createEmptySections(): ParsedSections {
  return {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };
}

function isPdfPageArtifact(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }

  return (
    /^[-–—*\s]*\d+\s+of\s+\d+\s*[-–—]*$/i.test(trimmed) ||
    /^--\s*\d+\s+of\s+\d+\s*--$/i.test(trimmed) ||
    /^page\s+\d+\s+of\s+\d+/i.test(trimmed) ||
    /^[-*]+\s+[-–—\s]*\d+\s+of\s+\d+/i.test(trimmed)
  );
}

function normalizeText(text: string) {
  return sanitizeText(
    text
      .replace(/\u2022/g, "-")
      .replace(/\t/g, " ")
      .replace(/\r/g, "")
      .split("\n")
      .filter((line) => !isPdfPageArtifact(line))
      .join("\n")
      .replace(/[ \u00a0]{2,}/g, " ")
      .trim(),
  );
}

function isHeading(line: string) {
  return sectionAliases.has(line.trim().toLowerCase().replace(/:$/, ""));
}

function sectionKeyFromHeading(line: string) {
  return sectionAliases.get(line.trim().toLowerCase().replace(/:$/, ""));
}

function splitResumeSections(text: string) {
  const header: string[] = [];
  const sections = createEmptySections();
  let currentSection: keyof ParsedSections | null = null;

  for (const rawLine of normalizeText(text).split("\n")) {
    const line = rawLine.trim();

    if (isHeading(line)) {
      currentSection = sectionKeyFromHeading(line) ?? null;
      continue;
    }

    if (!currentSection) {
      header.push(rawLine);
    } else {
      sections[currentSection].push(rawLine);
    }
  }

  return { header, sections };
}

function compactLines(lines: string[]) {
  return lines.map((line) => line.trim()).filter(Boolean);
}

function splitBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }

    current.push(line);
  }

  if (current.length) {
    blocks.push(current);
  }

  return blocks;
}

function firstMeaningfulLine(lines: string[]) {
  return compactLines(lines).find(
    (line) => !line.includes("@") && !/^https?:\/\//i.test(line) && !/linkedin/i.test(line),
  );
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractPhone(text: string) {
  return text.match(/(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/)?.[0] ?? "";
}

function extractUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi)].map((match) => match[0]);
}

function extractLocation(lines: string[]) {
  return (
    compactLines(lines).find((line) => {
      if (line.includes("@") || /https?:\/\//i.test(line) || /linkedin/i.test(line)) {
        return false;
      }
      if (extractPhone(line)) {
        return false;
      }

      return /,|remote|hybrid|onsite/i.test(line);
    }) ?? ""
  );
}

function splitSkillValues(lines: string[]) {
  const raw = compactLines(lines).join("\n");
  if (!raw) {
    return [];
  }

  const grouped = parseSkillGroups(raw);
  if (grouped.length) {
    return grouped;
  }

  const flat = dedupeStringsCaseInsensitive(
    compactLines(lines)
      .flatMap((line) => line.replace(/^[-*]\s*/, "").split(/[,|]/))
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 1 && !isArtifactSkill(skill)),
  );

  return flat.length ? [{ category: "Skills", items: flat }] : [];
}

function parseCertificationSection(lines: string[]) {
  const cleanLines = compactLines(lines.filter((line) => !isPdfPageArtifact(line)));
  if (!cleanLines.length) {
    return [];
  }

  const inlineFromSection = extractInlineCertificationsFromText(cleanLines.join("\n"));
  if (inlineFromSection.length) {
    return inlineFromSection;
  }

  const blocks = splitBlocks(cleanLines);
  const fromBlocks = blocks
    .map((block, index) => {
      const blockLines = block.filter((line) => !isPdfPageArtifact(line));
      const inline = extractInlineCertificationsFromText(blockLines.join("\n"));
      if (inline.length) {
        return inline[0];
      }

      return {
        id: `cert-${index + 1}`,
        name: blockLines[0] ?? "",
        issuer: blockLines[2] ?? "",
        date: blockLines[1] ?? "",
      };
    })
    .filter((entry) => entry.name.trim());

  if (fromBlocks.length) {
    return fromBlocks;
  }

  return cleanLines
    .map((line, index) => ({
      id: `cert-${index + 1}`,
      name: line.replace(/^[-*•]\s*/, "").trim(),
      issuer: "",
      date: "",
    }))
    .filter((entry) => entry.name.length > 2 && !/^certifications?\s*:/i.test(entry.name));
}

function extractInlineCertificationsFromText(text: string) {
  const certifications: ResumeContent["certifications"] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(/certifications?\s*:\s*([^\n]+)/gi)) {
    const payload = match[1].trim().replace(/[.;]+$/, "");
    const names = payload
      .split(/[,;|]/)
      .map((name) => name.trim())
      .filter((name) => name.length > 2);

    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      certifications.push({
        id: `cert-${certifications.length + 1}`,
        name,
        issuer: "",
        date: "",
      });
    }
  }

  return certifications;
}

function mergeCertificationLists(
  primary: ResumeContent["certifications"],
  additional: ResumeContent["certifications"],
) {
  const seen = new Set(primary.map((cert) => cert.name.toLowerCase()));
  const merged = [...primary];

  for (const cert of additional) {
    const key = cert.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push({
      ...cert,
      id: `cert-${merged.length + 1}`,
    });
  }

  return merged;
}

function stripInlineCertificationBullets(bullets: string[]) {
  return bullets.filter((bullet) => !/^certifications?\s*:/i.test(bullet.trim()));
}

export function repairResumeCertifications(content: ResumeContent): ResumeContent {
  const corpus = [
    content.summary,
    ...content.experiences.flatMap((experience) => experience.bullets),
    ...content.projects.flatMap((project) => project.bullets),
    ...content.education.flatMap((entry) => entry.highlights),
  ].join("\n");

  const inlineCerts = extractInlineCertificationsFromText(corpus);
  const certifications = mergeCertificationLists(content.certifications, inlineCerts);

  if (!inlineCerts.length) {
    return content;
  }

  return {
    ...content,
    certifications,
    experiences: content.experiences.map((experience) => ({
      ...experience,
      bullets: stripInlineCertificationBullets(experience.bullets),
    })),
    projects: content.projects.map((project) => ({
      ...project,
      bullets: stripInlineCertificationBullets(project.bullets),
    })),
  };
}

function collectCertifications(
  normalizedText: string,
  sections: ParsedSections,
  fallback: ResumeContent["certifications"],
) {
  const sectionCerts = parseCertificationSection(sections.certifications);
  const inlineCerts = extractInlineCertificationsFromText(normalizedText);
  const merged = mergeCertificationLists(sectionCerts, inlineCerts);

  return merged.length ? merged : fallback;
}

const DATE_RANGE_PATTERN =
  /(?:[A-Za-z]{3,9}\s+\d{4}|\d{4})(?:\s*(?:-|–|—|to)\s*(?:[A-Za-z]{3,9}\s+\d{4}|\d{4}|Present|Current))?/gi;

const DATE_SPLIT_PATTERN = /\s*(?:-|–|—|to)\s*/i;

function normalizeDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^unknown$/i.test(trimmed)) {
    return "";
  }

  if (trimmed.length <= 2 && !/^(19|20)\d{2}$/.test(trimmed)) {
    return "";
  }

  if (!/(present|current|\d{4}|[A-Za-z]{3,9}\s+\d{4})/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function extractDateRangeFromText(text: string) {
  const match = text.match(DATE_RANGE_PATTERN);
  if (!match?.[0]) {
    return { matched: false, startDate: "", endDate: "", remainder: text.trim() };
  }

  const firstRange = match[0];
  const parts = firstRange.split(DATE_SPLIT_PATTERN).map((part) => part.trim());

  return {
    matched: true,
    startDate: normalizeDateValue(parts[0] ?? ""),
    endDate: normalizeDateValue(parts[1] ?? parts[0] ?? ""),
    remainder: text.replace(firstRange, "").trim(),
  };
}

function isDateRangeLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const extracted = extractDateRangeFromText(trimmed);
  return extracted.matched && extracted.remainder.length <= 3;
}

function parseDateRange(lines: string[]) {
  const joined = lines.join(" ");
  const extracted = extractDateRangeFromText(joined);

  if (!extracted.matched) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  return {
    startDate: extracted.startDate,
    endDate: extracted.endDate,
  };
}

function parseTitleCompanyFromLine(line: string) {
  const trimmed = line.trim();
  let working = trimmed;
  let startDate = "";
  let endDate = "";

  const dateFromLine = extractDateRangeFromText(working);
  if (dateFromLine.matched) {
    startDate = dateFromLine.startDate;
    endDate = dateFromLine.endDate;
    working = dateFromLine.remainder.trim();
  }

  if (/ at /i.test(working)) {
    const [title, company] = working.split(/\s+at\s+/i);
    return {
      title: title.trim(),
      company: company.trim(),
      startDate,
      endDate,
    };
  }

  const pipeParts = working.split("|").map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 2) {
    return {
      title: pipeParts[0],
      company: pipeParts[1],
      startDate,
      endDate,
    };
  }

  const dashMatch = working.match(/^(.+?)\s*(?:—|–)\s*(.+)$/u);
  if (dashMatch) {
    return {
      title: dashMatch[1].trim(),
      company: dashMatch[2].trim(),
      startDate,
      endDate,
    };
  }

  const commaMatch = working.match(/^(.+?),\s*(.+)$/);
  if (commaMatch && commaMatch[2].split(/\s+/).length <= 8) {
    return {
      title: commaMatch[1].trim(),
      company: commaMatch[2].trim(),
      startDate,
      endDate,
    };
  }

  return {
    title: working,
    company: "",
    startDate,
    endDate,
  };
}

function isExperienceJobHeader(line: string) {
  const trimmed = line.trim();
  if (!trimmed || isPdfPageArtifact(trimmed) || /^[-*•]/.test(trimmed)) {
    return false;
  }

  if (isDateRangeLine(trimmed) || trimmed.length > 160) {
    return false;
  }

  if (
    /^(Built|Led|Developed|Managed|Architected|Implemented|Collaborated|Supported|Created|Engineered|Participated|Resolved|Owned|Ensured|Assisted|Drove|Partnered)\s/i.test(
      trimmed,
    )
  ) {
    return false;
  }

  const dashMatch = trimmed.match(/^(.+?)\s*(?:—|–)\s*(.+)$/u);
  if (dashMatch) {
    const company = dashMatch[2].trim();
    return company.split(/\s+/).length <= 8 && !isDateRangeLine(company);
  }

  if (/\s\|\s/.test(trimmed)) {
    const parts = trimmed.split("|").map((part) => part.trim());
    if (parts.length >= 2) {
      const right = parts[1];
      return !isDateRangeLine(right) && !/^\d{4}/.test(right);
    }
  }

  if (/\s+at\s+/i.test(trimmed) && trimmed.split(/\s+/).length <= 12) {
    return true;
  }

  const withoutDates = extractDateRangeFromText(trimmed).remainder;
  const commaMatch = withoutDates.match(/^(.+?),\s*(.+)$/);
  if (commaMatch) {
    const companyPart = commaMatch[2].trim();
    return (
      companyPart.split(/\s+/).length <= 5 &&
      !/using|with$/i.test(companyPart) &&
      !isDateRangeLine(companyPart)
    );
  }

  return false;
}

function isGarbageBullet(line: string) {
  const trimmed = line.trim();
  return (
    !trimmed ||
    isPdfPageArtifact(trimmed) ||
    /^\d+\s+of\s+\d+/i.test(trimmed) ||
    trimmed.length < 8
  );
}

function mergeWrappedBulletLines(lines: string[]) {
  const merged: string[] = [];

  for (const line of lines) {
    if (!merged.length) {
      merged.push(line);
      continue;
    }

    const previous = merged[merged.length - 1];
    const previousComplete = /[.!?)]$/.test(previous) || previous.length < 45;
    const startsNewEntry =
      /^[-*•]/.test(line) || isExperienceJobHeader(line) || isDateRangeLine(line);

    if (!previousComplete && !startsNewEntry && line.length > 10) {
      merged[merged.length - 1] = `${previous} ${line}`.replace(/\s+/g, " ").trim();
    } else {
      merged.push(line);
    }
  }

  return merged;
}

function splitExperienceLinesIntoJobs(lines: string[]) {
  const jobs: string[][] = [];
  let current: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || isPdfPageArtifact(line)) {
      continue;
    }

    if (isExperienceJobHeader(line) && current.length > 0) {
      const hasContent =
        current.some((entry) => entry.length > 40) ||
        current.filter((entry) => isDateRangeLine(entry)).length > 0;

      if (hasContent) {
        jobs.push(current);
        current = [line];
        continue;
      }
    }

    current.push(rawLine);
  }

  if (current.length) {
    jobs.push(current);
  }

  return jobs;
}

function inferDatesFromText(lines: string[]) {
  const years = [...lines.join(" ").matchAll(/\b(19|20)\d{2}\b/g)].map((match) => match[0]);
  if (years.length >= 2) {
    return { startDate: years[0], endDate: years[years.length - 1] };
  }

  if (years.length === 1) {
    return { startDate: years[0], endDate: "Present" };
  }

  return { startDate: "", endDate: "" };
}

function sanitizeJobTitle(value: string) {
  return value
    .replace(/\s*(?:—|–|-)\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeCompanyName(value: string) {
  const cleaned = extractDateRangeFromText(value).remainder.trim();
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function isImportedPlaceholder(value: string) {
  return /^imported\s+(role|experience|company)$/i.test(value.trim());
}

function isValidExperienceEntry(entry: ResumeContent["experiences"][number]) {
  if (isImportedPlaceholder(entry.title) || isImportedPlaceholder(entry.company)) {
    return false;
  }

  if (isDateRangeLine(entry.company)) {
    return false;
  }

  if (entry.title.length < 3) {
    return false;
  }

  const bullets = entry.bullets.filter((bullet) => !isGarbageBullet(bullet));
  if (!bullets.length) {
    return false;
  }

  return true;
}

export function repairImportedExperiences(experiences: ResumeContent["experiences"]) {
  return experiences
    .map((experience) => {
      let title = experience.title.trim();
      let company = experience.company.trim();
      let startDate = normalizeDateValue(experience.startDate);
      let endDate = normalizeDateValue(experience.endDate);

      if (isDateRangeLine(company)) {
        const dates = extractDateRangeFromText(company);
        startDate = startDate || dates.startDate;
        endDate = endDate || dates.endDate;
      }

      if (title.includes("—") || title.includes("–")) {
        const parsed = parseTitleCompanyFromLine(title);
        title = parsed.title || title;
        company = company && !isDateRangeLine(company) ? company : parsed.company || company;
        startDate = startDate || parsed.startDate;
        endDate = endDate || parsed.endDate;
      }

      if (isDateRangeLine(company)) {
        const dates = extractDateRangeFromText(company);
        const parsed = parseTitleCompanyFromLine(title);
        title = parsed.title || title;
        company = parsed.company || company;
        startDate = startDate || dates.startDate || parsed.startDate;
        endDate = endDate || dates.endDate || parsed.endDate;
      }

      const titleDates = extractDateRangeFromText(title);
      if (titleDates.matched) {
        startDate = startDate || titleDates.startDate;
        endDate = endDate || titleDates.endDate;
        title = titleDates.remainder;
      }

      company = sanitizeCompanyName(company);
      title = sanitizeJobTitle(title);

      if (!company) {
        const reparsed = parseTitleCompanyFromLine(title);
        title = reparsed.title || title;
        company = reparsed.company;
        startDate = startDate || reparsed.startDate;
        endDate = endDate || reparsed.endDate;
      }

      const inferred = inferDatesFromText([
        title,
        company,
        experience.location,
        ...experience.bullets,
      ]);
      startDate = startDate || inferred.startDate;
      endDate = endDate || inferred.endDate;

      const bullets = experience.bullets
        .map((bullet) => bullet.trim())
        .filter((bullet) => !isGarbageBullet(bullet));

      return {
        ...experience,
        title: sanitizeJobTitle(title),
        company: sanitizeCompanyName(company),
        startDate: startDate || inferred.startDate || "Present",
        endDate: endDate || inferred.endDate || startDate || "Present",
        bullets,
      };
    })
    .filter(isValidExperienceEntry);
}

function sanitizeImportedExperiences(experiences: ResumeContent["experiences"]) {
  return repairImportedExperiences(experiences);
}

function parseExperienceBlock(block: string[], index: number) {
  const merged = mergeWrappedBulletLines(
    block.map((line) => line.trim()).filter((line) => line && !isPdfPageArtifact(line)),
  );

  let title = "";
  let company = "";
  let startDate = "";
  let endDate = "";
  let location = "";
  const bullets: string[] = [];

  for (let index = 0; index < merged.length; index += 1) {
    const line = merged[index];

    if (isGarbageBullet(line) && !isExperienceJobHeader(line) && !isDateRangeLine(line)) {
      continue;
    }

    if (index < 3 && isExperienceJobHeader(line)) {
      const parsed = parseTitleCompanyFromLine(line);
      if (
        parsed.company &&
        !isDateRangeLine(parsed.company) &&
        !/^\d{4}/.test(parsed.company)
      ) {
        title = parsed.title;
        company = parsed.company;
        startDate = startDate || parsed.startDate;
        endDate = endDate || parsed.endDate;
        continue;
      }
    }

    if (index < 4 && isDateRangeLine(line)) {
      const dates = extractDateRangeFromText(line);
      startDate = dates.startDate || startDate;
      endDate = dates.endDate || endDate;
      continue;
    }

    if (
      /^(remote|hybrid|onsite)$/i.test(line) ||
      (/remote|hybrid|onsite/i.test(line) && line.includes(","))
    ) {
      location = line;
      continue;
    }

    const bullet = line.replace(/^[-*•]\s*/, "").trim();
    if (bullet.length > 15 && !isGarbageBullet(bullet)) {
      bullets.push(bullet);
    }
  }

  if (!title && merged[0]) {
    const parsed = parseTitleCompanyFromLine(merged[0]);
    title = parsed.title;
    company = parsed.company;
    startDate = startDate || parsed.startDate;
    endDate = endDate || parsed.endDate;
  }

  const blockDates = parseDateRange(merged.slice(0, 4));
  startDate = startDate || blockDates.startDate;
  endDate = endDate || blockDates.endDate;

  const inferred = inferDatesFromText(merged);
  startDate = startDate || inferred.startDate;
  endDate = endDate || inferred.endDate;

  return {
    id: `exp-${index + 1}`,
    company: sanitizeCompanyName(company),
    title: sanitizeJobTitle(title),
    location,
    startDate: startDate || inferred.startDate || "Present",
    endDate: endDate || inferred.endDate || startDate || "Present",
    bullets,
  };
}

function splitTitleAndCompany(primary: string, secondary: string) {
  const primaryParsed = parseTitleCompanyFromLine(primary);

  if (primaryParsed.company) {
    return {
      title: primaryParsed.title,
      company: primaryParsed.company,
      startDate: primaryParsed.startDate,
      endDate: primaryParsed.endDate,
    };
  }

  if (isDateRangeLine(secondary)) {
    const dates = extractDateRangeFromText(secondary);
    return {
      title: primaryParsed.title,
      company: primaryParsed.company,
      startDate: dates.startDate || primaryParsed.startDate,
      endDate: dates.endDate || primaryParsed.endDate,
    };
  }

  if (/ at /i.test(primary)) {
    const [title, company] = primary.split(/\s+at\s+/i);
    return {
      title: title.trim(),
      company: company.trim(),
      startDate: primaryParsed.startDate,
      endDate: primaryParsed.endDate,
    };
  }

  const primaryParts = primary.split("|").map((part) => part.trim()).filter(Boolean);
  if (primaryParts.length >= 2) {
    return {
      title: primaryParts[0],
      company: primaryParts[1],
      startDate: primaryParsed.startDate,
      endDate: primaryParsed.endDate,
    };
  }

  if (secondary) {
    const secondaryParsed = parseTitleCompanyFromLine(secondary);
    return {
      title: primaryParsed.title || secondaryParsed.title,
      company: secondaryParsed.company || secondary,
      startDate: primaryParsed.startDate || secondaryParsed.startDate,
      endDate: primaryParsed.endDate || secondaryParsed.endDate,
    };
  }

  return {
    title: primaryParsed.title || primary,
    company: primaryParsed.company || "Imported Experience",
    startDate: primaryParsed.startDate,
    endDate: primaryParsed.endDate,
  };
}

function parseExperienceSection(lines: string[], fallback: ResumeContent["experiences"]) {
  const cleanLines = lines.filter((line) => !isPdfPageArtifact(line.trim()));

  let blocks = splitBlocks(cleanLines);
  if (blocks.length === 1 && blocks[0].length > 4) {
    const jobBlocks = splitExperienceLinesIntoJobs(blocks[0]);
    if (jobBlocks.length > 1) {
      blocks = jobBlocks;
    }
  }

  if (!blocks.length && cleanLines.length) {
    blocks = splitExperienceLinesIntoJobs(cleanLines);
  }

  if (!blocks.length) {
    return sanitizeImportedExperiences(fallback);
  }

  const parsed = blocks
    .map((block, index) => parseExperienceBlock(block, index))
    .filter(isValidExperienceEntry);

  const sanitized = sanitizeImportedExperiences(parsed);
  return sanitized.length ? sanitized : sanitizeImportedExperiences(fallback);
}

function parseEducationSection(lines: string[], fallback: ResumeContent["education"]) {
  const blocks = splitBlocks(lines);
  if (!blocks.length) {
    return fallback;
  }

  const parsed = blocks.map((block, index) => {
    const bulletLines = block
      .filter((line) => /^[-*]/.test(line))
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    const infoLines = block.filter((line) => !/^[-*]/.test(line));
    const school = infoLines[0] ?? "Imported School";
    const degree = infoLines[1] ?? "Imported Degree";
    const graduationDate =
      parseDateRange(infoLines).endDate ||
      infoLines.find((line) => /\b(19|20)\d{2}\b/.test(line)) ||
      inferDatesFromText(infoLines).endDate ||
      "Present";
    const location =
      infoLines.find((line) => /remote|hybrid|onsite|,/.test(line) && !/\d{4}/.test(line)) ?? "";

    return {
      id: `edu-${index + 1}`,
      school,
      degree,
      location,
      graduationDate,
      highlights: bulletLines,
    };
  });

  return parsed.length ? parsed : fallback;
}

function isMeaningfulProjectName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || isPdfPageArtifact(trimmed)) {
    return false;
  }

  return !/^imported project\s+\d+$/i.test(trimmed);
}

function parseProjectSection(lines: string[]) {
  const cleanLines = lines.filter((line) => !isPdfPageArtifact(line));
  const blocks = splitBlocks(cleanLines);
  if (!blocks.length) {
    return [];
  }

  const parsed = blocks.map((block, index) => {
    const bulletLines = block
      .filter((line) => /^[-*]/.test(line))
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => Boolean(line) && !isPdfPageArtifact(line));
    const infoLines = block
      .filter((line) => !/^[-*]/.test(line))
      .filter((line) => !isPdfPageArtifact(line));

    const name = infoLines[0]?.trim() ?? "";
    const role = infoLines[1]?.trim() ?? "";
    const url = extractUrls(block.join(" "))[0] ?? "";
    const bullets =
      bulletLines.length > 0
        ? bulletLines
        : infoLines.slice(2).filter((line) => line.length > 12 && !isPdfPageArtifact(line));

    return {
      id: `project-${index + 1}`,
      name,
      role,
      url,
      bullets,
    };
  });

  return parsed.filter(
    (project) =>
      isMeaningfulProjectName(project.name) &&
      project.bullets.length > 0 &&
      project.bullets.every((bullet) => !isPdfPageArtifact(bullet)),
  );
}

export function parseResumeTextToContent(text: string, fallbackResume: ResumeContent) {
  const normalized = normalizeText(text);
  const { header, sections } = splitResumeSections(normalized);
  const urls = extractUrls(normalized);
  const linkedin = coalescePersonalUrl(
    urls.find((url) => /linkedin\.com/i.test(url)),
    fallbackResume.personal.linkedin,
  );
  const github = coalescePersonalUrl(
    urls.find((url) => /github\.com/i.test(url)),
    fallbackResume.personal.github,
  );
  const portfolio = coalescePersonalUrl(
    urls.find((url) => !/linkedin\.com/i.test(url) && !/github\.com/i.test(url)),
    fallbackResume.personal.portfolio,
  );
  const skillGroups = splitSkillValues(sections.skills);
  const summary = compactLines(sections.summary).join(" ").trim();
  const headerLines = compactLines(header);
  const headline =
    headerLines.length > 1 && !extractEmail(headerLines[1]) && !extractPhone(headerLines[1])
      ? headerLines[1]
      : fallbackResume.personal.headline;

  const imported = normalizeResumeContent({
    title: fallbackResume.title,
    personal: {
      fullName: firstMeaningfulLine(header) ?? fallbackResume.personal.fullName,
      headline,
      email: extractEmail(normalized) || fallbackResume.personal.email,
      phone: extractPhone(normalized) || fallbackResume.personal.phone,
      location: extractLocation(header) || fallbackResume.personal.location,
      linkedin,
      github,
      portfolio,
    },
    summary:
      summary.length >= 20
        ? summary
        : compactLines(header).slice(1, 4).join(" ").trim() || fallbackResume.summary,
    skillGroups:
      skillGroups.length > 0 ? skillGroups : fallbackResume.skillGroups,
    experiences: parseExperienceSection(sections.experience, fallbackResume.experiences).map(
      (experience) => ({
        ...experience,
        bullets: stripInlineCertificationBullets(experience.bullets),
      }),
    ),
    education: parseEducationSection(sections.education, fallbackResume.education),
    projects: parseProjectSection(sections.projects).map((project) => ({
      ...project,
      bullets: stripInlineCertificationBullets(project.bullets),
    })),
    certifications: collectCertifications(
      normalized,
      sections,
      fallbackResume.certifications,
    ),
  });

  return imported;
}

export async function extractTextFromResumeFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf") {
    PDFParse.setWorker(pdfWorkerUrl);
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText({ pageJoiner: "" });
      return normalizeText(parsed.text);
    } finally {
      await parser.destroy();
    }
  }

  if (extension === "docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    return normalizeText(parsed.value);
  }

  if (["txt", "md", "text"].includes(extension) || file.type.startsWith("text/")) {
    return normalizeText(buffer.toString("utf8"));
  }

  throw new Error("Unsupported resume format. Upload a PDF, DOCX, TXT, or MD file.");
}
