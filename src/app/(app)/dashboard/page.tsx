import Link from "next/link";

import { createResumeAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/store";
import {
  cardClass,
  cardElevatedClass,
  gradientHeroClass,
} from "@/lib/ui/styles";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${cardClass} text-center sm:text-left`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { resumes, jobs, versions, applications } = await getDashboardData(user.id);

  return (
    <div className="space-y-8">
      <section className={`${gradientHeroClass} flex flex-wrap items-end justify-between gap-6`}>
        <div>
          <p className="text-sm font-semibold text-indigo-200">Your workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Build, tailor, and track applications
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-indigo-100/90">
            Open a base resume to edit and save, then tailor it for each job posting.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <form action={createResumeAction}>
            <button
              type="submit"
              className="rounded-xl border border-white/30 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              + Create new resume
            </button>
          </form>
          <p className="text-xs text-indigo-100/80">Adds a blank resume to edit online</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Base resumes" value={resumes.length} />
        <StatCard label="Target jobs" value={jobs.length} />
        <StatCard label="Tailored versions" value={versions.length} />
        <StatCard label="Applications" value={applications.length} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={cardElevatedClass}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-600">Resume library</p>
              <h2 className="text-2xl font-semibold text-zinc-950">Base resumes</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/resumes/${resume.id}`}
                className="block rounded-2xl border border-zinc-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{resume.content.title}</p>
                    <p className="mt-1 text-sm text-zinc-600">{resume.content.personal.fullName}</p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-sm font-medium text-indigo-600">Recent tailored resumes</p>
            <div className="mt-4 space-y-3">
              {versions.length ? (
                versions.slice(0, 5).map((version) => (
                  <Link
                    key={version.id}
                    href={`/resumes/${version.baseResumeId}/versions/${version.id}`}
                    className="block rounded-2xl border border-zinc-200 p-4"
                  >
                    <p className="font-medium text-zinc-900">{version.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No tailored outputs yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-indigo-600">Application tracker</p>
                <h2 className="text-2xl font-semibold text-zinc-950">Latest activity</h2>
              </div>
              <Link href="/applications" className="text-sm font-medium text-indigo-600">
                Open hub
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {applications.length ? (
                applications.slice(0, 5).map((application) => (
                  <div key={application.id} className="rounded-2xl border border-zinc-200 p-4">
                    <p className="font-medium text-zinc-900">
                      {application.company} · {application.role}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Status: <span className="capitalize">{application.status}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">
                  No applications yet. Create one from a tailored resume.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
