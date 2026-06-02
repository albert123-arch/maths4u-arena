import Link from "next/link";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cards = [
  {
    label: messages.dashboard.cards.tests.label,
    href: "/admin/tests",
    description: messages.dashboard.cards.tests.description,
    key: "tests",
  },
  {
    label: messages.dashboard.cards.questions.label,
    href: "/admin/questions",
    description: messages.dashboard.cards.questions.description,
    key: "questions",
  },
  {
    label: messages.dashboard.cards.sessions.label,
    href: "/admin/sessions",
    description: messages.dashboard.cards.sessions.description,
    key: "sessions",
  },
  {
    label: messages.dashboard.cards.results.label,
    href: "/admin/sessions",
    description: messages.dashboard.cards.results.description,
    key: "results",
  },
  {
    label: messages.dashboard.cards.students.label,
    href: "/admin/students",
    description: messages.dashboard.cards.students.description,
    key: "students",
  },
  {
    label: messages.dashboard.cards.series.label,
    href: "/admin/series",
    description: messages.dashboard.cards.series.description,
    key: "series",
  },
];

export default async function AdminDashboardPage() {
  const [tests, questions, sessions, answers, students, series] = await Promise.all([
    prisma.test.count(),
    prisma.question.count(),
    prisma.gameSession.count(),
    prisma.answer.count(),
    prisma.studentAccount.count(),
    prisma.series.count(),
  ]);
  const counts: Record<string, number> = {
    tests,
    questions,
    sessions,
    results: answers,
    students,
    series,
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.dashboard.title}</h1>
        <p className="mt-2 text-slate-600">{messages.dashboard.description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-md border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300"
          >
            <div className="text-3xl font-bold text-teal-800">{counts[card.key] ?? 0}</div>
            <h2 className="mt-3 text-lg font-semibold">{card.label}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
      <section className="rounded-md border border-dashed border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">{messages.dashboard.nextTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {messages.dashboard.nextDescription}
        </p>
      </section>
    </div>
  );
}
