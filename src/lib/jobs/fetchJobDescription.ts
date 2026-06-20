import { sanitizeText } from "@/lib/resume/sanitizeContent";

import {
  cleanJobDescriptionText,
  extractJobPostingBody,
} from "@/lib/jobs/cleanJobDescription";

function normalizeJobUrl(sourceUrl: string) {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("A job posting URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).toString();
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMetaContent(html: string, key: string) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return "";
}

function extractTagText(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return decodeHtmlEntities(match?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? "");
}

function extractFirstHeading(html: string) {
  return extractTagText(html, "h1") || extractTagText(html, "h2");
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function findJobPostingJsonLd(input: unknown): Record<string, unknown> | null {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      const result = findJobPostingJsonLd(entry);
      if (result) {
        return result;
      }
    }
    return null;
  }

  if (typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const type = record["@type"];
  if (
    type === "JobPosting" ||
    (Array.isArray(type) && type.some((entry) => String(entry).toLowerCase() === "jobposting"))
  ) {
    return record;
  }

  for (const value of Object.values(record)) {
    const result = findJobPostingJsonLd(value);
    if (result) {
      return result;
    }
  }

  return null;
}

export function extractJobMetadataFromHtml(html: string) {
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jobPosting = jsonLdMatches
    .map((match) => safeJsonParse(match[1] ?? ""))
    .map((value) => findJobPostingJsonLd(value))
    .find(Boolean);

  const titleFromJsonLd =
    typeof jobPosting?.title === "string" ? decodeHtmlEntities(jobPosting.title.trim()) : "";
  const companyFromJsonLd =
    typeof jobPosting?.hiringOrganization === "object" &&
    jobPosting.hiringOrganization &&
    typeof (jobPosting.hiringOrganization as Record<string, unknown>).name === "string"
      ? decodeHtmlEntities(
          String((jobPosting.hiringOrganization as Record<string, unknown>).name).trim(),
        )
      : "";
  const descriptionFromJsonLd =
    typeof jobPosting?.description === "string"
      ? decodeHtmlEntities(String(jobPosting.description).replace(/<[^>]+>/g, " ").trim())
      : "";

  return {
    pageTitle:
      titleFromJsonLd ||
      extractMetaContent(html, "og:title") ||
      extractMetaContent(html, "twitter:title") ||
      extractTagText(html, "title") ||
      extractFirstHeading(html),
    company:
      companyFromJsonLd ||
      extractMetaContent(html, "og:site_name") ||
      extractMetaContent(html, "application-name"),
    descriptionHint:
      descriptionFromJsonLd ||
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description"),
  };
}

export function extractReadableTextFromHtml(html: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? html;

  return decodeHtmlEntities(
    body
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|table)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

export async function fetchJobDescriptionFromUrl(sourceUrl: string) {
  const normalizedUrl = normalizeJobUrl(sourceUrl);
  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TalentPortalBot/1.0; +https://localhost/talent-portal)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch job description from URL (${response.status}).`);
  }

  const html = await response.text();
  const metadata = extractJobMetadataFromHtml(html);
  const plainText = extractReadableTextFromHtml(html);
  const postingBody = extractJobPostingBody(plainText);
  const jsonLdDescription = metadata.descriptionHint
    ? cleanJobDescriptionText(metadata.descriptionHint)
    : "";

  let description = "";
  if (jsonLdDescription.length >= 120) {
    description = jsonLdDescription;
  } else if (postingBody.length >= 120) {
    description = postingBody;
  } else {
    description = cleanJobDescriptionText(plainText);
  }

  if (description.length < 80) {
    throw new Error(
      "The job posting page did not return enough readable text. Paste the description manually if the site blocks scraping.",
    );
  }

  return {
    sourceUrl: normalizedUrl,
    description,
    pageTitle: metadata.pageTitle,
    companyHint: metadata.company,
  };
}

export async function resolveJobDescriptionInput(input: {
  sourceUrl?: string;
  description?: string;
}) {
  const description = input.description?.trim() ?? "";
  const sourceUrl = input.sourceUrl?.trim() ?? "";

  if (description) {
    return {
      sourceUrl,
      description: cleanJobDescriptionText(description),
      pageTitle: "",
      companyHint: "",
    };
  }

  if (!sourceUrl) {
    throw new Error("Paste a job description or provide a job posting URL.");
  }

  const fetched = await fetchJobDescriptionFromUrl(sourceUrl);
  return fetched;
}
