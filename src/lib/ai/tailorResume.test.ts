import { describe, expect, it } from "vitest";

import { tailorResume } from "@/lib/ai/tailorResume";
import { cleanJobRole } from "@/lib/jobs/parseJobDescription";
import { flattenSkillItems } from "@/lib/resume/sectionContent";
import { createEmptyResume, type TargetJob } from "@/lib/resume/schema";

describe("cleanJobRole", () => {
  it("extracts role title from LinkedIn-style posting titles", () => {
    expect(
      cleanJobRole("Habyt hiring Backend Engineer (NodeJS) in India | LinkedIn", "Habyt"),
    ).toBe("Backend Engineer (NodeJS)");
  });
});

describe("tailorResume", () => {
  it("returns a general resume without naming the target employer", async () => {
    const baseResume = createEmptyResume("user-1", "test@example.com", "Test User").content;
    const targetJob: TargetJob = {
      id: "job-1",
      userId: "user-1",
      company: "Acme",
      role: "Project Manager",
      sourceUrl: "",
      description:
        "Looking for project management, stakeholder communication, and process improvement experience.",
      keywords: ["project", "stakeholder", "process", "delivery"],
      responsibilities: ["Manage cross-functional projects"],
      createdAt: new Date().toISOString(),
    };

    const tailored = await tailorResume(baseResume, targetJob);

    expect(tailored.resume.title).toBe(baseResume.title);
    expect(tailored.resume.experiences[0].company).toBe(baseResume.experiences[0].company);
    expect(tailored.changeSummary.length).toBeGreaterThan(0);
    expect(flattenSkillItems(tailored.resume).length).toBeLessThanOrEqual(12);
    expect(tailored.resume.experiences[0].bullets.length).toBeLessThanOrEqual(3);
    expect(tailored.resume.summary).toMatch(/project/i);
    expect(tailored.resume.summary.toLowerCase()).not.toContain("acme");
    expect(tailored.resume.summary.toLowerCase()).not.toContain("aligned with");
    expect(tailored.resume.personal.headline).toBe("Project Manager");
    expect(tailored.resume.summary).not.toContain("professional targeting");
    expect(tailored.resume.summary).not.toContain("Offers experience aligned");
  });
});
