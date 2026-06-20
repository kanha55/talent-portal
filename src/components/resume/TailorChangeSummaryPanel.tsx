export function TailorChangeSummaryPanel({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  const warnings = [...new Set(items.filter((item) => item.startsWith("AI unavailable:")))];
  const changes = [...new Set(items.filter((item) => !item.startsWith("AI unavailable:")))];

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-8">
      <p className="text-sm font-medium text-indigo-600">Tailoring notes</p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950">What changed</h2>

      {warnings.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">GPT could not run for this version</p>
          <ul className="mt-2 space-y-2">
            {warnings.map((warning, index) => (
              <li key={`ai-warning-${index}`}>{warning.replace(/^AI unavailable:\s*/, "")}</li>
            ))}
          </ul>
          <p className="mt-3 text-amber-900">
            A template summary was used instead. Check your OpenAI billing and quota, then generate
            a new tailored resume.
          </p>
        </div>
      )}

      {changes.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-700">
          {changes.map((item, index) => (
            <li key={`change-${index}`} className="flex gap-2">
              <span className="text-indigo-600">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
