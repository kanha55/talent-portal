import path from "node:path";
import { pathToFileURL } from "node:url";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import {
  dedupeStringsCaseInsensitive,
  normalizeResumeContent,
  parseSkillGroups,
  type ResumeContent,
} from "@/lib/resume/schema";
import { isArtifactSkill } from "@/lib/jobs/cleanJobDescription";
import { sanitizeText } from "@/lib/resume/sanitizeContent";

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
  ["licenses", "certifications"],
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
  const blocks = splitBlocks(lines.filter((line) => !isPdfPageArtifact(line)));
  return blocks.map((block, index) => {
    const cleanLines = block.filter((line) => !isPdfPageArtifact(line));
    return {
      id: `cert-${index + 1}`,
      name: cleanLines[0] ?? "",
      issuer: cleanLines[2] ?? "",
      date: cleanLines[1] ?? "",
    };
  }).filter((entry) => entry.name.trim());
}

function parseDateRange(lines: string[]) {
  const joined = lines.join(" ");
  const matches =
    joined.match(
      /(?:[A-Za-z]{3,9}\s+\d{4}|\d{4}|Present|Current)(?:\s*[-–to]+\s*(?:[A-Za-z]{3,9}\s+\d{4}|\d{4}|Present|Current))?/gi,
    ) ?? [];

  if (matches.length === 0) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const firstRange = matches[0] ?? "";
  const parts = firstRange.split(/\s*[-–to]+\s*/i).map((part) => part.trim());

  return {
    startDate: parts[0] ?? "",
    endDate: parts[1] ?? parts[0] ?? "",
  };
}

function splitTitleAndCompany(primary: string, secondary: string) {
  if (/ at /i.test(primary)) {
    const [title, company] = primary.split(/\s+at\s+/i);
    return {
      title: title.trim(),
      company: company.trim(),
    };
  }

  const primaryParts = primary.split("|").map((part) => part.trim()).filter(Boolean);
  if (primaryParts.length >= 2) {
    return {
      title: primaryParts[0],
      company: primaryParts[1],
    };
  }

  if (secondary) {
    return {
      title: primary,
      company: secondary,
    };
  }

  return {
    title: primary,
    company: "Imported Experience",
  };
}

function parseExperienceSection(lines: string[], fallback: ResumeContent["experiences"]) {
  const blocks = splitBlocks(lines);
  if (!blocks.length) {
    return fallback;
  }

  const parsed = blocks
    .map((block, index) => {
      const bulletLines = block
        .filter((line) => /^[-*]/.test(line))
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
      const infoLines = block.filter((line) => !/^[-*]/.test(line));
      const headingOne = infoLines[0] ?? "";
      const headingTwo = infoLines[1] ?? "";
      const { title, company } = splitTitleAndCompany(headingOne, headingTwo);
      const { startDate, endDate } = parseDateRange(infoLines);
      const location =
        infoLines.find((line) => /remote|hybrid|onsite|,/.test(line) && !/\d{4}/.test(line)) ?? "";
      const bullets =
        bulletLines.length > 0
          ? bulletLines
          : infoLines.slice(2).filter((line) => line.length > 12);

      return {
        id: `exp-${index + 1}`,
        company: company || "Imported Company",
        title: title || "Imported Role",
        location,
        startDate: startDate || "Unknown",
        endDate: endDate || "Unknown",
        bullets: bullets.length ? bullets : ["Imported from uploaded resume."],
      };
    })
    .filter((entry) => entry.title && entry.company);

  return parsed.length ? parsed : fallback;
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
      "Unknown";
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

export function parseResumeTextToContent(
  text: string,
  fallbackResume: ResumeContent,
  titleHint = "Imported Resume",
) {
  const normalized = normalizeText(text);
  const { header, sections } = splitResumeSections(normalized);
  const urls = extractUrls(normalized);
  const linkedin = urls.find((url) => /linkedin\.com/i.test(url)) ?? fallbackResume.personal.linkedin;
  const github =
    urls.find((url) => /github\.com/i.test(url)) ?? fallbackResume.personal.github;
  const portfolio =
    urls.find((url) => !/linkedin\.com/i.test(url) && !/github\.com/i.test(url)) ??
    fallbackResume.personal.portfolio;
  const skillGroups = splitSkillValues(sections.skills);
  const summary = compactLines(sections.summary).join(" ").trim();
  const headerLines = compactLines(header);
  const headline =
    headerLines.length > 1 && !extractEmail(headerLines[1]) && !extractPhone(headerLines[1])
      ? headerLines[1]
      : fallbackResume.personal.headline;

  const imported = normalizeResumeContent({
    title: fallbackResume.title === "Base Resume" ? titleHint : fallbackResume.title,
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
    experiences: parseExperienceSection(sections.experience, fallbackResume.experiences),
    education: parseEducationSection(sections.education, fallbackResume.education),
    projects: parseProjectSection(sections.projects),
    certifications: parseCertificationSection(sections.certifications),
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
