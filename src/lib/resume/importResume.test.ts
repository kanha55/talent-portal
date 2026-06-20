import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/resume/schema";
import {
  parseResumeTextToContent,
  repairImportedExperiences,
  repairResumeCertifications,
} from "@/lib/resume/importResume";
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

    const parsed = parseResumeTextToContent(sampleResume, fallback);

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

    const parsed = parseResumeTextToContent(sampleResume, fallback);

    expect(parsed.projects).toEqual([]);
    expect(parsed.experiences[0].bullets.every((bullet) => !/of\s+3/i.test(bullet))).toBe(true);
  });

  it("parses em-dash job headers, date lines, and multiple roles", () => {
    const fallback = createEmptyResume("user-1", "base@example.com", "Base User").content;
    const sampleResume = `
Kanhaiya Dubey
kanhaiya@example.com

Work Experience
Senior Frontend Developer — Nagarro
OCT 2024 – Present
Architected scalable React.js applications using modular component structures and reusable design patterns.
Led a frontend team to deliver a complex project on time and within budget.

Senior Frontend Developer — Bacancy Technologies
JAN 2022 – SEP 2024
Built responsive web interfaces using HTML5, CSS3, JavaScript (ES6+), and Bootstrap.
Managed complex application state using Redux and Redux Toolkit with Thunk middleware.

React.js Developer — Bacancy Technologies
JAN 2020 – DEC 2021
Developed React.js components and integrated third-party APIs to deliver dynamic user interfaces.
    `;

    const parsed = parseResumeTextToContent(sampleResume, fallback);

    expect(parsed.experiences).toHaveLength(3);
    expect(parsed.experiences[0].title).toBe("Senior Frontend Developer");
    expect(parsed.experiences[0].company).toBe("Nagarro");
    expect(parsed.experiences[0].startDate).toBe("OCT 2024");
    expect(parsed.experiences[0].endDate).toBe("Present");
    expect(parsed.experiences[0].startDate).not.toBe("Unknown");
    expect(parsed.experiences[0].endDate).not.toBe("C");
    expect(parsed.experiences[1].company).toBe("Bacancy Technologies");
    expect(parsed.experiences[2].title).toBe("React.js Developer");
  });

  it("repairs swapped company/date fields from bad imports", () => {
    const fallback = createEmptyResume("user-1", "base@example.com", "Base User").content;
    const repaired = repairImportedExperiences([
      {
        id: "exp-1",
        company: "OCT 2024 – Present",
        title: "Senior Frontend Developer — Nagarro",
        location: "",
        startDate: "Unknown",
        endDate: "C",
        bullets: [
          "Architected scalable React.js applications using modular component structures.",
          "Led a frontend team to deliver a complex project on time and within budget.",
        ],
      },
      {
        id: "exp-2",
        company: "Imported Experience",
        title: "Imported Role",
        location: "",
        startDate: "Unknown",
        endDate: "Unknown",
        bullets: ["- 1 of 3 --"],
      },
    ]);

    expect(repaired).toHaveLength(1);
    expect(repaired[0].company).toBe("Nagarro");
    expect(repaired[0].title).toBe("Senior Frontend Developer");
    expect(repaired[0].startDate).toBe("OCT 2024");
    expect(repaired[0].endDate).toBe("Present");
  });

  it("extracts inline certifications from project bullets and loads them into certifications", () => {
    const fallback = createEmptyResume("user-1", "base@example.com", "Base User").content;
    const sampleResume = `
Kanhaiya Dubey
kanhaiya@example.com

Experience
Senior Frontend Developer — Nagarro
OCT 2024 – Present
Architected scalable React.js applications.

Projects
Flexcar
Tech Stack: React.js, Redux Toolkit
Built reusable React.js components for dashboards.

Certifications: Applied CS With Android, React.js Frontend Development, Node.js Fundamentals
    `;

    const parsed = parseResumeTextToContent(sampleResume, fallback);

    expect(parsed.certifications).toHaveLength(3);
    expect(parsed.certifications.map((cert) => cert.name)).toContain("Applied CS With Android");
    expect(parsed.certifications.map((cert) => cert.name)).toContain(
      "React.js Frontend Development",
    );
    expect(parsed.certifications.map((cert) => cert.name)).toContain("Node.js Fundamentals");
    expect(
      parsed.projects.every((project) =>
        project.bullets.every((bullet) => !/^certifications?\s*:/i.test(bullet)),
      ),
    ).toBe(true);
  });

  it("repairResumeCertifications pulls inline certs from existing project bullets", () => {
    const fallback = createEmptyResume("user-1", "base@example.com", "Base User").content;
    const repaired = repairResumeCertifications({
      ...fallback,
      projects: [
        {
          id: "project-1",
          name: "Flexcar",
          role: "",
          url: "",
          bullets: [
            "Built dashboards with React.js.",
            "Certifications: Applied CS With Android, React.js Frontend Development",
          ],
        },
      ],
    });

    expect(repaired.certifications).toHaveLength(2);
    expect(repaired.projects[0].bullets).toEqual(["Built dashboards with React.js."]);
  });
});
