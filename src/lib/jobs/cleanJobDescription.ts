import { sanitizeText } from "@/lib/resume/sanitizeContent";

const LINKEDIN_BOILERPLATE =
  /^(sign in|join now|join or sign|email or phone|password|forgot password|agree\s*&?\s*join|skip to main|clear text|expand search|show more|show less|similar jobs|people also viewed|explore top content|more searches|save time applying|you.?re signed out|language|accessibility|user agreement|privacy policy|cookie policy|copyright policy|brand policy|guest controls|community guidelines|referrals increase|get notified|see who you know|report this job|apply|save|new to linkedin|sign in with email|posted\s+\d)/i;

const GARBAGE_ROLE_PATTERNS = [
  /^agree\s*&?\s*join/i,
  /linkedin$/i,
  /^sign\s+in/i,
  /^skip\s+to/i,
  /^join\s+now/i,
  /^clear\s+text/i,
];

const KEYWORD_STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "from",
  "that",
  "will",
  "your",
  "have",
  "our",
  "for",
  "you",
  "are",
  "this",
  "into",
  "about",
  "their",
  "role",
  "team",
  "years",
  "work",
  "using",
  "including",
  "ability",
  "jobs",
  "job",
  "join",
  "sign",
  "linkedin",
  "ago",
  "open",
  "united",
  "states",
  "india",
  "remote",
  "months",
  "apply",
  "save",
  "show",
  "more",
  "less",
  "similar",
  "people",
  "viewed",
  "developer",
  "engineer",
  "software",
  "full",
  "time",
  "level",
  "senior",
  "junior",
  "posted",
  "applicants",
  "hiring",
  "bairesdev",
  "mercor",
  "crossing",
  "hurdles",
]);

const TECH_KEYWORD_PATTERNS = [
  /\bNode\.?js\b/gi,
  /\bTypeScript\b/gi,
  /\bJavaScript\b/gi,
  /\bPython\b/gi,
  /\bRuby\b/gi,
  /\bRails\b/gi,
  /\bReact\.?js?\b/gi,
  /\bPostgreSQL\b/gi,
  /\bMySQL\b/gi,
  /\bMongoDB\b/gi,
  /\bRedis\b/gi,
  /\bAWS\b/gi,
  /\bDocker\b/gi,
  /\bKubernetes\b/gi,
  /\bGraphQL\b/gi,
  /\bREST(?:ful)?\s+APIs?\b/gi,
  /\bOAuth\b/gi,
  /\bJWT\b/gi,
  /\bKafka\b/gi,
  /\bLambda\b/gi,
  /\bECS\b/gi,
  /\bFargate\b/gi,
  /\bS3\b/gi,
  /\bRDS\b/gi,
  /\bSQS\b/gi,
  /\bSNS\b/gi,
  /\bCloudWatch\b/gi,
  /\bAPI Gateway\b/gi,
  /\bExpress\.?js\b/gi,
  /\bNext\.?js\b/gi,
  /\bVue\.?js\b/gi,
  /\bAngular\b/gi,
  /\bTerraform\b/gi,
  /\bSidekiq\b/gi,
  /\bHeroku\b/gi,
  /\bGitHub\b/gi,
  /\bCI\/CD\b/gi,
  /\bRSpec\b/gi,
  /\bTailwind\b/gi,
  /\bRedux\b/gi,
  /\bHTML5?\b/gi,
  /\bCSS3?\b/gi,
  /\bSCSS\b/gi,
  /\bBootstrap\b/gi,
  /\bMicroservices\b/gi,
  /\bSaaS\b/gi,
];

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isLinkedInBoilerplateLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) {
    return true;
  }

  return LINKEDIN_BOILERPLATE.test(trimmed);
}

export function cleanJobDescriptionText(text: string) {
  const sanitized = sanitizeText(text);

  const lines = sanitized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isLinkedInBoilerplateLine(line));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractJobPostingBody(plainText: string) {
  const cleaned = cleanJobDescriptionText(plainText);

  const patterns = [
    /Job (?:Overview|Description):\s*([\s\S]*?)(?=Seniority level|Employment type|Similar Searches|Show fewer jobs|Must-Have Skills|Key Skills Required)/i,
    /Key Skills Required:\s*([\s\S]*?)(?=Requirements:|Must-Have Skills|Seniority level|Employment type)/i,
    /Must-Have Skills\s*([\s\S]*?)(?=Seniority level|Employment type|Industries|Similar Searches)/i,
    /Report this job\s+([\s\S]*?)(?:Show more|Show less|Seniority level|Similar jobs|People also viewed)/i,
    /We(?:'re| are) looking[\s\S]*?(?=Similar jobs|Show more jobs|People also viewed|Seniority level)/i,
    /About (?:the role|Reserv|[\w\s]+)\s+([\s\S]*?)(?=Show more|Seniority level|What you(?:'ll| will))/i,
    /What you(?:'ll| will) do\s+([\s\S]*?)(?=Show more|Seniority level|Requirements|Benefits|What we offer)/i,
    /Responsibilities\s+([\s\S]*?)(?=Ideal Profile|Requirements|What we offer|Show more|Seniority level)/i,
    /Ideal Profile\s+([\s\S]*?)(?=Requirements|What(?:'s| is) on offer|Show more|Seniority level)/i,
    /Requirements\s+([\s\S]*?)(?=Nice to have|What(?:'s| is) on offer|Benefits|Show more)/i,
  ];

  const sections: string[] = [];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1] && match[1].trim().length > 40) {
      sections.push(cleanJobDescriptionText(match[1]));
    } else if (match?.[0] && match[0].trim().length > 80) {
      sections.push(cleanJobDescriptionText(match[0]));
    }
  }

  if (sections.length) {
    return cleanJobDescriptionText(sections.join("\n\n"));
  }

  return cleaned.length > 120 ? cleaned : "";
}

export function isGarbageJobRole(role: string) {
  const trimmed = role.trim();
  if (!trimmed || trimmed.length < 3) {
    return true;
  }

  return GARBAGE_ROLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function extractTechKeywords(description: string) {
  const seen = new Set<string>();
  const found: string[] = [];

  for (const pattern of TECH_KEYWORD_PATTERNS) {
    for (const match of description.matchAll(pattern)) {
      const normalized = normalizeKeyword(match[0]);
      const key = normalized.toLowerCase();
      if (normalized && !seen.has(key)) {
        seen.add(key);
        found.push(normalized);
      }
    }
  }

  return found;
}

export function extractJobKeywords(description: string) {
  const techKeywords = extractTechKeywords(description);
  const tokens = description
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9+#./-]/g, ""))
    .filter((token) => token.length >= 3 && !KEYWORD_STOP_WORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const frequencyKeywords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([token]) => token);

  const merged = [...techKeywords];
  for (const keyword of frequencyKeywords) {
    if (!merged.some((entry) => entry.toLowerCase() === keyword)) {
      merged.push(keyword);
    }
  }

  return merged.slice(0, 16);
}

export function isArtifactSkill(skill: string) {
  const trimmed = skill.trim();
  return (
    !trimmed ||
    /^-\s*\d+\s+of\s+\d+/i.test(trimmed) ||
    trimmed.length < 2 ||
    /^tools and platforms$/i.test(trimmed)
  );
}
