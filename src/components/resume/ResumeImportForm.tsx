"use client";

import { useFormStatus } from "react-dom";

import { importResumeAction } from "@/app/actions";

function ImportSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Extracting…" : "Extract and fill"}
    </button>
  );
}

function ImportStatusMessage() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-indigo-700">
      Reading your file and filling the editor fields…
    </p>
  );
}

export function ResumeImportForm({ resumeId }: { resumeId: string }) {
  return (
    <form
      action={importResumeAction}
      className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5"
    >
      <input type="hidden" name="resumeId" value={resumeId} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-700">Upload resume</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
            Upload a PDF, DOCX, TXT, or Markdown resume and the app will extract text to
            prefill the editor fields below.
          </p>
          <ImportStatusMessage />
        </div>
        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <input
            type="file"
            name="resumeFile"
            required
            accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          <ImportSubmitButton />
        </div>
      </div>
    </form>
  );
}
