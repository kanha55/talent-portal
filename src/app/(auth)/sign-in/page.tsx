import Link from "next/link";

import { signInAction, signUpAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  cardElevatedClass,
  gradientHeroClass,
  inputClass,
  labelClass,
} from "@/lib/ui/styles";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const activeTab = query.tab === "signup" ? "signup" : "signin";
  const error = query.error;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className={gradientHeroClass}>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
            Talent Portal
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Build resumes that get interviews.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-indigo-100/90">
            Edit your base resume, tailor it to each job with AI, export ATS-friendly PDFs, and
            track every application in one workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-indigo-50/90">
            <li className="flex gap-2">
              <span className="text-indigo-300">✓</span> Structured resume editor with save
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-300">✓</span> Job-specific tailored versions
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-300">✓</span> ATS keyword feedback & exports
            </li>
          </ul>
        </section>

        <section className={`${cardElevatedClass} text-zinc-900`}>
          <div className="flex gap-2 rounded-xl bg-zinc-100 p-1">
            <Link
              href="/sign-in?tab=signin"
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
                activeTab === "signin"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-800 hover:bg-white/60 hover:text-indigo-700"
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-in?tab=signup"
              className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
                activeTab === "signup"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-zinc-800 hover:bg-white/60 hover:text-indigo-700"
              }`}
            >
              Sign up
            </Link>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {activeTab === "signin" ? (
            <form action={signInAction} className="mt-6 space-y-4">
              <div>
                <p className="text-lg font-semibold text-zinc-900">Welcome back</p>
                <p className="mt-1 text-sm text-zinc-500">Sign in with your email and password.</p>
              </div>
              <label className="block space-y-1.5">
                <span className={labelClass}>Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={1}
                  className={inputClass}
                  placeholder="Your password"
                />
              </label>
              <button type="submit" className={`${btnPrimaryClass} w-full`}>Sign in</button>
            </form>
          ) : (
            <form action={signUpAction} className="mt-6 space-y-4">
              <div>
                <p className="text-lg font-semibold text-zinc-900">Create your account</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Username, email, and password — takes less than a minute.
                </p>
              </div>
              <label className="block space-y-1.5">
                <span className={labelClass}>Full name</span>
                <input name="name" required className={inputClass} placeholder="Your full name" />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Username</span>
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9_]+"
                  className={inputClass}
                  placeholder="your_username"
                />
                <p className="text-xs text-zinc-500">Letters, numbers, and underscores only.</p>
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  className={inputClass}
                  placeholder="At least 8 characters"
                />
              </label>
              <button type="submit" className={`${btnPrimaryClass} w-full`}>
                Create account
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
