import { describe, expect, it } from "vitest";

import {
  cleanJobDescriptionText,
  extractJobKeywords,
  extractJobPostingBody,
  isGarbageJobRole,
} from "@/lib/jobs/cleanJobDescription";

describe("cleanJobDescription", () => {
  it("removes LinkedIn login boilerplate from scraped text", () => {
    const cleaned = cleanJobDescriptionText(
      "Agree & Join LinkedIn\nSign in\nJoin now\nWe are looking for a Backend Engineer with Node.js experience.",
    );

    expect(cleaned).toContain("Backend Engineer");
    expect(cleaned.toLowerCase()).not.toContain("agree & join");
    expect(cleaned.toLowerCase()).not.toContain("sign in");
  });

  it("extracts posting body between LinkedIn job sections", () => {
    const body = extractJobPostingBody(
      "Report this job\nWe are looking for a Backend Engineer with 3-5 years of experience building scalable web applications.\nResponsibilities\nDesigning APIs and database schemas.\nShow more\nSimilar jobs",
    );

    expect(body).toContain("Backend Engineer");
    expect(body).toContain("Designing APIs");
    expect(body.toLowerCase()).not.toContain("similar jobs");
  });

  it("flags garbage scraped roles", () => {
    expect(isGarbageJobRole("Agree & Join LinkedIn")).toBe(true);
    expect(isGarbageJobRole("Backend Engineer (NodeJS)")).toBe(false);
  });

  it("extracts technical keywords instead of page navigation tokens", () => {
    const keywords = extractJobKeywords(
      "Backend Engineer with Node.js, TypeScript, PostgreSQL, AWS Lambda, and REST APIs in a SaaS environment.",
    );

    expect(keywords).toContain("Node.js");
    expect(keywords).toContain("TypeScript");
    expect(keywords).toContain("PostgreSQL");
    expect(keywords).not.toContain("jobs");
    expect(keywords).not.toContain("linkedin");
  });
});
