import { describe, expect, it } from "vitest";

import { buildGenerateSummaryPrompt } from "@/lib/ai/prompts/generateSummary";
import { createEmptyResume } from "@/lib/resume/schema";

describe("buildGenerateSummaryPrompt", () => {
  it("includes full candidate profile and summary instructions", () => {
    const resume = createEmptyResume("user-1", "test@example.com", "Test User").content;
    const prompt = buildGenerateSummaryPrompt(resume, {
      id: "job-1",
      userId: "user-1",
      company: "Acme",
      role: "Senior Software Engineer",
      sourceUrl: "",
      description: "Node.js, TypeScript, AWS backend role.",
      keywords: ["nodejs", "typescript", "aws"],
      responsibilities: ["Build scalable APIs"],
      createdAt: new Date().toISOString(),
    });

    expect(prompt).toContain("Exactly 2-3 complete sentences");
    expect(prompt).toContain("workExperience");
    expect(prompt).toContain("Senior Software Engineer");
    expect(prompt).toContain("nodejs");
    expect(prompt).toContain('"summary"');
  });
});
