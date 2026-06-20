"use client";

import { useFormStatus } from "react-dom";

import { tailorResumeAction } from "@/app/actions";
import { OpenAiStatusBanner } from "@/components/resume/OpenAiStatusBanner";
import { btnPrimaryClass, cardElevatedClass, inputClass } from "@/lib/ui/styles";

function TailorSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${btnPrimaryClass} w-full disabled:opacity-70`}>
      {pending ? "Generating tailored resume…" : "Generate tailored resume"}
    </button>
  );
}

function TailorStatusMessage() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-indigo-700">
      Tailoring your resume for this job. This can take a few seconds…
    </p>
  );
}

export function TailorResumeForm({ resumeId }: { resumeId: string }) {
  return (
    <form action={tailorResumeAction} className={`${cardElevatedClass} space-y-4`}>
      <input type="hidden" name="resumeId" value={resumeId} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">AI tailoring</p>
        <h2 className="mt-1 text-xl font-bold text-zinc-900">Target job</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Paste the job description or URL. Company and role are auto-extracted when left blank.
        </p>
      </div>
      <TailorStatusMessage />
      <OpenAiStatusBanner />
      <input name="company" placeholder="Company" className={inputClass} />
      <input name="role" placeholder="Role title" className={inputClass} />
      <input name="sourceUrl" placeholder="Job posting URL" className={inputClass} />
      <textarea
        name="description"
        placeholder="Paste the full job description…"
        rows={12}
        className={inputClass}
      />
      <TailorSubmitButton />
    </form>
  );
}
