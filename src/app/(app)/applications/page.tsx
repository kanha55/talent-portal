import { ApplicationTable } from "@/components/applications/ApplicationTable";
import { requireUser } from "@/lib/auth";
import { getApplications } from "@/lib/store";

export default async function ApplicationsPage() {
  const user = await requireUser();
  const { applications, versions, jobs } = await getApplications(user.id);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-8">
        <p className="text-sm font-medium text-indigo-600">Application hub</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">
          Manage progress from one place.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
          Every saved application stays linked to the tailored resume version and target role it was created from, so you can keep edits, exports, and status changes connected.
        </p>
      </section>

      <ApplicationTable applications={applications} versions={versions} jobs={jobs} />
    </div>
  );
}
