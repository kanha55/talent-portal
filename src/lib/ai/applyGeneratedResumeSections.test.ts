import { describe, expect, it } from "vitest";

import { applyGeneratedResumeSections } from "@/lib/ai/tailorResume";
import { createEmptyResume } from "@/lib/resume/schema";

describe("applyGeneratedResumeSections", () => {
  it("merges LLM output into experience, education, skills, and certifications", () => {
    const baseResume = createEmptyResume("user-1", "test@example.com", "Test User").content;

    const { resume, changeSummary } = applyGeneratedResumeSections(baseResume, {
      summary:
        "Operations specialist with five years improving delivery workflows and stakeholder outcomes across remote teams.",
      headline: "Senior Operations Specialist",
      experiences: [
        {
          id: "exp-1",
          bullets: [
            "Reduced cycle time by 20% by streamlining intake workflows.",
            "Partnered with product to launch two customer-facing improvements.",
          ],
        },
      ],
      education: [
        {
          id: baseResume.education[0].id,
          highlights: ["Dean's list", "Business analytics coursework"],
        },
      ],
      skillGroups: [
        {
          category: "Core skills",
          items: ["Process improvement", "Stakeholder management", "Data analysis"],
        },
      ],
      certifications: [],
      changeSummary: ["Updated all resume sections with AI."],
    });

    expect(resume.summary).toContain("Operations specialist");
    expect(resume.personal.headline).toBe("Senior Operations Specialist");
    expect(resume.experiences[0].bullets).toHaveLength(2);
    expect(resume.education[0].highlights).toContain("Dean's list");
    expect(resume.skillGroups[0].items).toContain("Process improvement");
    expect(changeSummary).toContain("Updated all resume sections with AI.");
  });
});
