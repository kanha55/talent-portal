export function AiFeedbackBanner({
  aiError,
  aiSections,
  aiSummary,
}: {
  aiError?: string;
  aiSections?: boolean;
  aiSummary?: boolean;
}) {
  if (aiSections || aiSummary) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        AI generated your professional summary, work experience bullets, education highlights,
        keyword-rich skills, and certifications (when present). Review each section below and
        click Save resume if you edit anything.
      </div>
    );
  }

  if (!aiError) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-medium">Could not generate resume sections with AI</p>
      <p className="mt-2 leading-6">{aiError}</p>
    </div>
  );
}
