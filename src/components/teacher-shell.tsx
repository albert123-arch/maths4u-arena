import Link from "next/link";

import type { AuthUser } from "@/lib/auth";
import { messages } from "@/lib/messages";

import { LogoutButton } from "./logout-button";

const navItems = [
  { href: "/teacher", label: messages.teacherShell.nav.dashboard },
  { href: "/teacher/classes", label: messages.teacherShell.nav.classes },
  { href: "/teacher/students", label: messages.teacherShell.nav.students },
  { href: "/teacher/tests", label: messages.teacherShell.nav.tests },
  { href: "/teacher/questions", label: messages.teacherShell.nav.questions },
  { href: "/teacher/library", label: messages.teacherShell.nav.library },
  { href: "/teacher/live", label: messages.teacherShell.nav.live },
  { href: "/teacher/assignments", label: messages.teacherShell.nav.assignments },
  { href: "/teacher/results", label: messages.teacherShell.nav.results },
];

export function TeacherShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AuthUser;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/teacher" className="text-xl font-bold">
              {messages.common.appName}
            </Link>
            <p className="text-sm text-slate-500">{messages.teacherShell.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[190px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
