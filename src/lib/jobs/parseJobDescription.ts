import {
  cleanJobDescriptionText,
  extractJobKeywords,
  isGarbageJobRole,
} from "@/lib/jobs/cleanJobDescription";

function unique(strings: string[]) {
  return [...new Set(strings)];
}

function toTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanHeading(value: string) {
  return value
    .replace(/\s*[-|:]\s*(remote|hybrid|onsite).*$/i, "")
    .replace(/\s+\|\s+.*$/, "")
    .trim();
}

export function extractKeywords(description: string) {
  return extractJobKeywords(description);
}

export function extractResponsibilities(description: string) {
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines
    .filter((line) => /^[-*]/.test(line))
    .map((line) => line.replace(/^[-*]\s*/, ""));

  if (bulletLines.length > 0) {
    return unique(bulletLines.filter(Boolean)).slice(0, 8);
  }

  const sentences = description
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35 && !/^(designing|developing|building)\b/i.test(sentence));

  return unique(sentences.filter(Boolean)).slice(0, 8);
}

function inferCompanyFromPageTitle(pageTitle?: string) {
  if (!pageTitle?.trim()) {
    return "";
  }

  const hiringMatch = pageTitle.trim().match(/^([A-Za-z0-9][A-Za-z0-9.\-& ]{2,50})\s+hiring\s+/i);
  if (hiringMatch?.[1] && !/linkedin/i.test(hiringMatch[1])) {
    return hiringMatch[1].trim();
  }

  return "";
}

function inferCompanyFromDescription(description: string, role: string) {
  const rolePrefix = role.trim().split(/\s+/).slice(0, 4).join(" ");
  if (rolePrefix.length >= 4) {
    const escaped = escapeRegExp(rolePrefix);
    const match = description.match(
      new RegExp(`${escaped}[\\s\\n]+([A-Za-z0-9][A-Za-z0-9.\\-& ]{2,50})[\\s\\n]+India`, "i"),
    );
    if (
      match?.[1] &&
      !/linkedin|learning|jobs|people|developer|engineer|trainee/i.test(match[1])
    ) {
      return match[1].trim();
    }
  }

  const companyLine = description.match(
    /\n([A-Za-z0-9][A-Za-z0-9.\-& ]{2,50})\nIndia\n(?:\d+ days ago|Over \d+ applicants)/i,
  );
  if (
    companyLine?.[1] &&
    !/linkedin|learning|jobs|people|developer|engineer/i.test(companyLine[1])
  ) {
    return companyLine[1].trim();
  }

  return "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferCompanyFromUrl(sourceUrl?: string) {
  if (!sourceUrl) {
    return "";
  }

  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./i, "");
    const base = hostname.split(".")[0] ?? "";
    if (
      !base ||
      ["jobs", "careers", "apply", "boards", "greenhouse", "lever", "linkedin", "www"].includes(
        base.toLowerCase(),
      )
    ) {
      return "";
    }

    return toTitleCase(base);
  } catch {
    return "";
  }
}

export function cleanJobRole(role: string, companyHint?: string) {
  let cleaned = role.trim();
  if (!cleaned) {
    return "";
  }

  cleaned = cleaned.replace(/\s*\|\s*linkedin.*$/i, "").trim();
  cleaned = cleaned.replace(/\s+on\s+linkedin\s*$/i, "").trim();
  cleaned = cleaned.replace(/\s*[-–—]\s*linkedin\s*$/i, "").trim();

  const hiringMatch = cleaned.match(/^(.+?)\s+hiring\s+(.+)$/i);
  if (hiringMatch) {
    cleaned = hiringMatch[2].trim();
  }

  cleaned = cleaned.replace(/\s+in\s+[A-Za-z][A-Za-z\s,.-]+$/i, "").trim();

  const company = companyHint?.trim();
  if (company) {
    const patterns = [
      new RegExp(`^${escapeRegExp(company)}\\s*[-|:]\\s*`, "i"),
      new RegExp(`^${escapeRegExp(company)}\\s+hiring\\s+`, "i"),
      new RegExp(`\\s+at\\s+${escapeRegExp(company)}$`, "i"),
    ];

    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, "").trim();
    }
  }

  return cleaned;
}

function inferRoleFromDescription(
  description: string,
  pageTitle?: string,
  companyHint?: string,
) {
  const fromTitle = cleanJobRole(cleanHeading(pageTitle ?? ""), companyHint);
  if (fromTitle && fromTitle.length <= 80 && !isGarbageJobRole(fromTitle)) {
    return fromTitle;
  }

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstCandidate = lines.find(
    (line) =>
      line.length >= 4 &&
      line.length <= 80 &&
      !/^https?:\/\//i.test(line) &&
      !/^(about|responsibilities|requirements|qualifications|overview)\b/i.test(line) &&
      !isGarbageJobRole(line),
  );

  return firstCandidate ? cleanJobRole(firstCandidate, companyHint) : "";
}

function fallbackResponsibilities(description: string, keywords: string[]) {
  const responsibilities = extractResponsibilities(description);
  if (responsibilities.length) {
    return responsibilities;
  }

  const primaryKeyword = keywords[0] ?? "the role";
  return [`Deliver outcomes aligned with ${primaryKeyword} requirements from the job description.`];
}

export function parseJobDescription(input: {
  company: string;
  role: string;
  sourceUrl?: string;
  description: string;
  pageTitle?: string;
  companyHint?: string;
}) {
  const description = cleanJobDescriptionText(input.description.trim());
  const keywords = extractKeywords(description);
  const responsibilities = extractResponsibilities(description);

  const inferredRole =
    input.role.trim() ||
    inferRoleFromDescription(description, input.pageTitle, input.companyHint) ||
    "Target Role";

  const company =
    input.company.trim() ||
    input.companyHint?.trim() ||
    inferCompanyFromPageTitle(input.pageTitle) ||
    inferCompanyFromDescription(description, inferredRole) ||
    inferCompanyFromUrl(input.sourceUrl) ||
    "Target Company";

  let role = cleanJobRole(
    inferredRole,
    company !== "Target Company" ? company : input.companyHint,
  );

  if (isGarbageJobRole(role)) {
    role = cleanJobRole(
      inferRoleFromDescription(description, input.pageTitle, input.companyHint),
      input.companyHint,
    );
  }

  if (isGarbageJobRole(role)) {
    role = "Software Engineer";
  }

  return {
    company,
    role,
    sourceUrl: input.sourceUrl?.trim() ?? "",
    description,
    keywords,
    responsibilities: responsibilities.length
      ? responsibilities
      : fallbackResponsibilities(description, keywords),
  };
}
