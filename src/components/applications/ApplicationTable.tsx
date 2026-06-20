import { updateApplicationStatusAction } from "@/app/actions";
import type { TailoredResumeVersion, TargetJob } from "@/lib/resume/schema";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

const statuses: ApplicationStatus[] = [
  "draft",
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

function statusTone(status: ApplicationStatus) {
  switch (status) {
    case "offer":
      return "bg-emerald-100 text-emerald-800";
    case "interview":
      return "bg-sky-100 text-sky-800";
    case "applied":
      return "bg-indigo-100 text-indigo-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function ApplicationTable({
  applications,
  versions,
  jobs,
}: {
  applications: ApplicationRecord[];
  versions: TailoredResumeVersion[];
  jobs: TargetJob[];
}) {
  const versionMap = new Map(versions.map((version) => [version.id, version]));
  const jobMap = new Map(jobs.map((job) => [job.id, job]));

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
        No applications yet. Create one from a tailored resume to start tracking progress.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Resume</th>
            <th className="px-4 py-3 font-medium">Match</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {applications.map((application) => {
            const version = versionMap.get(application.resumeVersionId);
            const job = jobMap.get(application.targetJobId);

            return (
              <tr key={application.id} className="align-top">
                <td className="px-4 py-3 font-medium text-zinc-900">{application.company}</td>
                <td className="px-4 py-3 text-zinc-700">{application.role}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {version ? (
                    <a
                      href={`/resumes/${version.baseResumeId}/versions/${version.id}`}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      {version.title}
                    </a>
                  ) : (
                    "Linked version missing"
                  )}
                  {job ? <div className="mt-1 text-xs text-zinc-500">{job.role}</div> : null}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {application.meta
                    ? `${application.meta.keywords_matched.length} matched · ${application.meta.keywords_missing.length} missing`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-700">{application.source || "Manual entry"}</td>
                <td className="px-4 py-3">
                  <form action={updateApplicationStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <select
                      name="status"
                      defaultValue={application.status}
                      className={`rounded-full px-3 py-2 text-xs font-medium ${statusTone(application.status)}`}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700"
                    >
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-zinc-600">{application.notes || "No notes yet."}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
