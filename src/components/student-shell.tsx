import Link from "next/link";

import { messages } from "@/lib/messages";
import type { StudentSessionUser } from "@/lib/student-auth";

import { StudentLogoutButton } from "./student-logout-button";
import { SupportMaths4UFooterLink } from "./support-maths4u";

const navItems = [
  { href: "/student", label: messages.student.dashboard },
  { href: "/student/assignments", label: messages.student.assignmentsTitle },
  { href: "/student/series", label: messages.student.seriesTitle },
  { href: "/student/results", label: messages.student.resultsTitle },
];

export function StudentShell({
  children,
  student,
}: {
  children: React.ReactNode;
  student: StudentSessionUser;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/student" className="text-xl font-bold">
              {messages.common.appName}
            </Link>
            <p className="text-sm text-slate-500">{messages.student.dashboard}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{student.displayName}</span>
            <StudentLogoutButton />
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
      <footer className="mx-auto flex max-w-6xl justify-center px-4 pb-6">
        <SupportMaths4UFooterLink />
      </footer>
    </div>
  );
}
