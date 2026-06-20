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
});
