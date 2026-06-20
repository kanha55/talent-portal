import { describe, expect, it } from "vitest";

import { generateAtsReport } from "@/lib/resume/atsChecks";
import { createEmptyResume, type TargetJob } from "@/lib/resume/schema";

describe("generateAtsReport", () => {
  it("calculates keyword coverage and warnings", () => {
    const baseResume = createEmptyResume("user-1", "test@example.com", "Test User").content;
    const targetJob: TargetJob = {
      id: "job-1",
      userId: "user-1",
      company: "Acme",
      role: "Operations Analyst",
      sourceUrl: "",
      description: "Operations analyst role focused on reporting, stakeholder communication, and process improvement.",
      keywords: ["reporting", "stakeholder", "process", "excel"],
      responsibilities: ["Build reporting", "Improve process"],
      createdAt: new Date().toISOString(),
    };

    const report = generateAtsReport({
      userId: "user-1",
      versionId: "version-1",
      baseResume,
      tailoredResume: baseResume,
      targetJob,
    });

    expect(report.keywordCoverage).toBeGreaterThan(0);
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.diffHighlights.length).toBeGreaterThan(0);
  });
});
