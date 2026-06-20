import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractJobMetadataFromHtml,
  extractReadableTextFromHtml,
  resolveJobDescriptionInput,
} from "@/lib/jobs/fetchJobDescription";

describe("extractReadableTextFromHtml", () => {
  it("removes scripts and returns readable body text", () => {
    const html = `
      <html>
        <body>
          <script>console.log("ignore")</script>
          <section>
            <h1>Senior Product Manager</h1>
            <p>Drive roadmap execution across platform teams.</p>
            <ul><li>Own planning cadence</li><li>Partner with engineering</li></ul>
          </section>
        </body>
      </html>
    `;

    const text = extractReadableTextFromHtml(html);

    expect(text).toContain("Senior Product Manager");
    expect(text).toContain("Drive roadmap execution across platform teams.");
    expect(text).toContain("Own planning cadence");
    expect(text).not.toContain("console.log");
  });
});

describe("extractJobMetadataFromHtml", () => {
  it("extracts title and company hints from metadata and json-ld", () => {
    const html = `
      <html>
        <head>
          <title>Senior Product Manager | ExampleCo</title>
          <meta property="og:site_name" content="ExampleCo" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Senior Product Manager",
              "hiringOrganization": { "@type": "Organization", "name": "ExampleCo" },
              "description": "Lead roadmap planning and execution."
            }
          </script>
        </head>
      </html>
    `;

    const metadata = extractJobMetadataFromHtml(html);

    expect(metadata.pageTitle).toContain("Senior Product Manager");
    expect(metadata.company).toBe("ExampleCo");
    expect(metadata.descriptionHint).toContain("Lead roadmap planning");
  });
});

describe("resolveJobDescriptionInput", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the pasted description when present", async () => {
    const resolved = await resolveJobDescriptionInput({
      sourceUrl: "https://example.com/job",
      description: "Directly pasted job description text.",
    });

    expect(resolved.description).toBe("Directly pasted job description text.");
    expect(resolved.sourceUrl).toBe("https://example.com/job");
  });

  it("fetches the description from the provided URL when the textarea is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          `<body><h1>Platform Engineer</h1><p>Build internal tooling and platform systems with product and infrastructure teams.</p><li>Improve deployment workflows</li></body>`,
      }),
    );

    const resolved = await resolveJobDescriptionInput({
      sourceUrl: "example.com/job",
      description: "",
    });

    expect(resolved.sourceUrl).toBe("https://example.com/job");
    expect(resolved.description).toContain("Platform Engineer");
    expect(resolved.description).toContain("Improve deployment workflows");
    expect(resolved.pageTitle).toBe("Platform Engineer");
  });
});
