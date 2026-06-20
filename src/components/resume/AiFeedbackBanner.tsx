export function AiFeedbackBanner({
  aiError,
  aiSummary,
}: {
  aiError?: string;
  aiSummary?: boolean;
}) {
  if (aiSummary) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        GPT professional summary generated. Review it below and click Save resume if you edit
        anything.
      </div>
    );
  }

  if (!aiError) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-medium">Could not generate GPT summary</p>
      <p className="mt-2 leading-6">{aiError}</p>
    </div>
  );
}
