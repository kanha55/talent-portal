import { describe, expect, it } from "vitest";

import {
  createEmptyResume,
  formatEducationBlocks,
  formatExperienceBlocks,
  formatSkillGroups,
  normalizeResumeContent,
  resumeContentFromFormData,
  sanitizePersonalEmail,
} from "@/lib/resume/schema";
import { flattenSkillItems } from "@/lib/resume/sectionContent";

describe("resumeContentFromFormData", () => {
  it("parses structured resume fields into validated content", () => {
    const seed = createEmptyResume("user-1", "test@example.com", "Test User");
    const formData = new FormData();

    formData.set("title", seed.content.title);
    formData.set("fullName", seed.content.personal.fullName);
    formData.set("email", seed.content.personal.email);
    formData.set("phone", seed.content.personal.phone);
    formData.set("location", seed.content.personal.location);
    formData.set("headline", seed.content.personal.headline);
    formData.set("linkedin", seed.content.personal.linkedin);
    formData.set("github", seed.content.personal.github);
    formData.set("portfolio", seed.content.personal.portfolio);
    formData.set("summary", seed.content.summary);
    formData.set("skillGroups", formatSkillGroups(seed.content.skillGroups));
    formData.set("experiences", formatExperienceBlocks(seed.content.experiences));
    formData.set("education", formatEducationBlocks(seed.content.education));
    formData.set("certifications", "");
    formData.set("projects", "");

    const parsed = resumeContentFromFormData(formData);

    expect(parsed.title).toBe(seed.content.title);
    expect(parsed.experiences[0].company).toBe(seed.content.experiences[0].company);
    expect(flattenSkillItems(parsed)).toContain("Stakeholder management");
  });

  it("sanitizes invalid resume emails before validation", () => {
    const normalized = normalizeResumeContent(
      {
        ...createEmptyResume("user-1", "valid@example.com", "Test User").content,
        personal: {
          ...createEmptyResume("user-1", "valid@example.com", "Test User").content.personal,
          email: "kk@kk",
        },
      },
      { fallbackEmail: "valid@example.com" },
    );

    expect(normalized.personal.email).toBe("valid@example.com");
    expect(sanitizePersonalEmail("kk@kk")).toBe("kk@example.com");
  });
});
