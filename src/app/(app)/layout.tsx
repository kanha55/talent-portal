import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { btnSecondaryClass, pageShellClass } from "@/lib/ui/styles";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className={`${pageShellClass} flex items-center justify-between gap-6 py-4`}>
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white"
              >
                TP
              </span>
              <div>
                <p className="text-sm font-bold text-zinc-900">Talent Portal</p>
                <p className="text-xs text-zinc-500">@{user.username}</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:inline">{user.name}</span>
            <form action={signOutAction}>
              <button type="submit" className={btnSecondaryClass}>Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className={pageShellClass}>{children}</main>
    </div>
  );
}
