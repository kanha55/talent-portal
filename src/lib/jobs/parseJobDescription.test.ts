import { describe, expect, it } from "vitest";

import { parseJobDescription } from "@/lib/jobs/parseJobDescription";

describe("parseJobDescription", () => {
  it("cleans LinkedIn posting titles into a role-only label", () => {
    const parsed = parseJobDescription({
      company: "",
      role: "",
      sourceUrl: "https://www.linkedin.com/jobs/view/123",
      description:
        "Backend Engineer role requiring Node.js, APIs, and PostgreSQL experience across distributed systems.",
      pageTitle: "Habyt hiring Backend Engineer (NodeJS) in India | LinkedIn",
      companyHint: "Habyt",
    });

    expect(parsed.role).toBe("Backend Engineer (NodeJS)");
    expect(parsed.company).toBe("Habyt");
  });

  it("extracts company from LinkedIn page title when company hint is empty", () => {
    const parsed = parseJobDescription({
      company: "",
      role: "",
      sourceUrl: "https://www.linkedin.com/jobs/view/4416379770/",
      description:
        "We are looking for a skilled Full Stack Developer with experience in AWS, Ruby on Rails, React.js, JavaScript, MySQL, and Elasticsearch.",
      pageTitle: "Programmers.io hiring Senior Ruby on Rails Developer in India | LinkedIn",
      companyHint: "",
    });

    expect(parsed.role).toBe("Senior Ruby on Rails Developer");
    expect(parsed.company).toBe("Programmers.io");
  });
});
