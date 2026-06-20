import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { btnPrimaryClass, btnSecondaryClass, cardElevatedClass, gradientHeroClass } from "@/lib/ui/styles";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section>
          <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            For job seekers
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Tailor every resume to the role you want.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            Edit a structured base resume, generate job-specific versions with AI, get ATS
            feedback, and track applications — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-in?tab=signup" className={btnPrimaryClass}>Create free account</Link>
            <Link href="/sign-in?tab=signin" className={btnSecondaryClass}>Sign in</Link>
          </div>
        </section>

        <section className={gradientHeroClass}>
          <h2 className="text-xl font-bold">Everything you need</h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-indigo-100">
            <li>Online resume editor with save</li>
            <li>AI tailoring from job descriptions</li>
            <li>ATS keyword coverage & warnings</li>
            <li>PDF / DOCX export & application tracker</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
