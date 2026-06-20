import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/resume/schema";
import { parseResumeTextToContent } from "@/lib/resume/importResume";
import { flattenSkillItems } from "@/lib/resume/sectionContent";

describe("parseResumeTextToContent", () => {
  it("extracts structured resume content from uploaded resume text", () => {
    const fallback = createEmptyResume("user-1", "base@example.com", "Base User").content;
    const sampleResume = `
Alex Johnson
Seattle, WA
alex@example.com
+1 555-123-4567
https://www.linkedin.com/in/alex-johnson
https://alexjohnson.dev

Summary
Product-minded operations professional with experience improving workflows, shipping cross-functional initiatives, and reporting business results.

Skills
Stakeholder Management, Process Improvement, SQL, Data Analysis, Program Management

Experience
Operations Manager | BrightCo
Seattle, WA | 2021 - Present
- Led workflow improvements that reduced turnaround time by 28%.
- Built weekly KPI reporting used by leadership for planning.

Program Analyst | Northstar
Remote | 2019 - 2021
- Coordinated cross-functional projects across product and support teams.

Education
University of Washington
B.A. Business Administration
2019

Projects
Analytics Rollout
Lead Contributor
- Standardized reporting definitions across teams.
    `;

    const parsed = parseResumeTextToContent(sampleResume, fallback, "Alex Johnson Resume");

    expect(parsed.personal.fullName).toBe("Alex Johnson");
    expect(parsed.personal.email).toBe("alex@example.com");
    expect(flattenSkillItems(parsed)).toContain("SQL");
    expect(parsed.experiences[0].company).toBe("BrightCo");
    expect(parsed.experiences[0].title).toBe("Operations Manager");
    expect(parsed.education[0].school).toBe("University of Washington");
    expect(parsed.projects[0].name).toBe("Analytics Rollout");
  });

  it("ignores PDF page markers and does not create junk project blocks", () => {
    const fallback = createEmptyResume("user-1", "base@example.com", "Base User").content;
    const sampleResume = `
Alex Johnson
alex@example.com

Summary
Product-minded operations professional with experience improving workflows and reporting business results.

Experience
Operations Manager | BrightCo
2021 - Present
- Led workflow improvements.

-- 2 of 3 --
- - 2 of 3 --
    `;

    const parsed = parseResumeTextToContent(sampleResume, fallback, "Alex Johnson Resume");

    expect(parsed.projects).toEqual([]);
    expect(parsed.experiences[0].bullets.every((bullet) => !/of\s+3/i.test(bullet))).toBe(true);
  });
});
