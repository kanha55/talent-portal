import Link from "next/link";
import { notFound } from "next/navigation";

import { createApplicationAction } from "@/app/actions";
import { AtsFeedbackPanel } from "@/components/resume/AtsFeedbackPanel";
import { TailorChangeSummaryPanel } from "@/components/resume/TailorChangeSummaryPanel";
import { ResumeDiff } from "@/components/resume/ResumeDiff";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { requireUser } from "@/lib/auth";
import { getResumeVersion } from "@/lib/store";

export default async function ResumeVersionPage({
  params,
}: {
  params: Promise<{ resumeId: string; versionId: string }>;
}) {
  const { resumeId, versionId } = await params;
  const user = await requireUser();
  const workspace = await getResumeVersion(user.id, versionId);

  if (!workspace || !workspace.baseResume || !workspace.job) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href={`/resumes/${resumeId}`} className="text-sm font-medium text-indigo-600">
                Back to base resume
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                {workspace.version.title}
              </h1>
              <p className="mt-3 text-sm text-zinc-600">
                Tailored for {workspace.job.role} at {workspace.job.company}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/resumes/export?versionId=${workspace.version.id}&format=docx`}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Export DOCX
              </a>
              <a
                href={`/api/resumes/export?versionId=${workspace.version.id}&format=pdf`}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
              >
                Export PDF
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-500">Role</p>
              <p className="mt-2 text-lg font-semibold text-zinc-950">{workspace.job.role}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-500">Company</p>
              <p className="mt-2 text-lg font-semibold text-zinc-950">{workspace.job.company}</p>
            </div>
          </div>
        </div>

        <form action={createApplicationAction} className="rounded-[2rem] border border-zinc-200 bg-white p-8">
          <input type="hidden" name="resumeId" value={resumeId} />
          <input type="hidden" name="resumeVersionId" value={workspace.version.id} />
          <input type="hidden" name="targetJobId" value={workspace.job.id} />

          <p className="text-sm font-medium text-indigo-600">Application handoff</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950">Track this version</h2>
          <div className="mt-4 space-y-4">
            <input
              name="company"
              defaultValue={workspace.job.company}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            />
            <input
              name="role"
              defaultValue={workspace.job.role}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
            />
            <input
              name="source"
              defaultValue={workspace.job.sourceUrl}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
              placeholder="Source or posting URL"
            />
            <textarea
              name="notes"
              rows={5}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
              placeholder="Add notes for this application."
            />
            <button
              type="submit"
              className="w-full rounded-full bg-zinc-950 px-4 py-3 text-sm font-medium text-white"
            >
              Save to application tracker
            </button>
          </div>
        </form>
      </section>

      <TailorChangeSummaryPanel items={workspace.version.changeSummary} />
      <AtsFeedbackPanel report={workspace.report} />
      <ResumePreview
        resume={workspace.version.resume}
        roleLabel={`${workspace.job.role} · ${workspace.job.company}`}
      />
      <ResumeDiff
        baseResume={workspace.baseResume.content}
        tailoredResume={workspace.version.resume}
      />
    </div>
  );
}
