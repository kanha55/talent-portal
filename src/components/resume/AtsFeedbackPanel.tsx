import type { AtsReport } from "@/lib/resume/schema";

function scoreTone(score: number) {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-sky-600";
  return "text-amber-600";
}

export function AtsFeedbackPanel({ report }: { report: AtsReport | null }) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
        Tailor a resume to generate ATS feedback and keyword coverage insights.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">ATS score</p>
          <p className={`text-4xl font-semibold ${scoreTone(report.overallScore)}`}>
            {report.overallScore}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Keyword coverage</p>
          <p className="text-2xl font-semibold text-zinc-900">{report.keywordCoverage}%</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="text-sm font-semibold text-zinc-900">Matched keywords</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.matchedKeywords.length ? (
              report.matchedKeywords.map((keyword, index) => (
                <span
                  key={`matched-${index}-${keyword}`}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">No keyword matches yet.</span>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-zinc-900">Missing keywords</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.missingKeywords.length ? (
              report.missingKeywords.map((keyword, index) => (
                <span
                  key={`missing-${index}-${keyword}`}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">No major keyword gaps detected.</span>
            )}
          </div>
        </section>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Highlights</h3>
        <ul className="mt-2 space-y-2 text-sm text-zinc-700">
          {report.diffHighlights.map((item, index) => (
            <li key={`highlight-${index}`}>- {item}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Warnings</h3>
          <ul className="mt-2 space-y-2 text-sm text-zinc-700">
            {report.warnings.length ? (
              report.warnings.map((warning, index) => <li key={`warning-${index}`}>- {warning}</li>)
            ) : (
              <li>No major ATS formatting warnings detected.</li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Missing sections</h3>
          <ul className="mt-2 space-y-2 text-sm text-zinc-700">
            {report.missingSections.length ? (
              report.missingSections.map((section, index) => <li key={`section-${index}`}>- {section}</li>)
            ) : (
              <li>Core sections are present.</li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
