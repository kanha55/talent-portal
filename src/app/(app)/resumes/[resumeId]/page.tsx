import { notFound } from "next/navigation";

import { AtsFeedbackPanel } from "@/components/resume/AtsFeedbackPanel";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { requireUser } from "@/lib/auth";
import { getResumeWorkspace } from "@/lib/store";

export default async function ResumePage({
  params,
  searchParams,
}: {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<{ aiError?: string; aiSummary?: string; saved?: string }>;
}) {
  const { resumeId } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const workspace = await getResumeWorkspace(user.id, resumeId);

  if (!workspace) {
    notFound();
  }

  const latestVersion = workspace.versions[0];
  const latestReport =
    workspace.reports.find((report) => report.id === latestVersion?.atsReportId) ?? null;

  return (
    <div className="space-y-6">
      <ResumeEditor
        resume={workspace.resume}
        versions={workspace.versions}
        aiError={query.aiError}
        aiSummary={query.aiSummary === "1"}
        saved={query.saved === "1"}
      />
      <AtsFeedbackPanel report={latestReport} />
    </div>
  );
}
