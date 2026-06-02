import Link from "next/link";

import { messages } from "@/lib/messages";

export const dynamic = "force-dynamic";

const qaCards = [
  {
    title: messages.qa.cards.classicGuest.title,
    description: messages.qa.cards.classicGuest.description,
    links: [
      { href: "/admin/tests", label: messages.adminShell.nav.tests },
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
      { href: "/play", label: messages.sessions.playLink },
    ],
  },
  {
    title: messages.qa.cards.hostPacedGuest.title,
    description: messages.qa.cards.hostPacedGuest.description,
    links: [
      { href: "/admin/tests", label: messages.adminShell.nav.tests },
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
    ],
  },
  {
    title: messages.qa.cards.teamMode.title,
    description: messages.qa.cards.teamMode.description,
    links: [
      { href: "/admin/tests", label: messages.adminShell.nav.tests },
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
      { href: "/play", label: messages.sessions.playLink },
    ],
  },
  {
    title: messages.qa.cards.seriesClassic.title,
    description: messages.qa.cards.seriesClassic.description,
    links: [
      { href: "/admin/series", label: messages.adminShell.nav.series },
      { href: "/admin/students", label: messages.adminShell.nav.students },
      { href: "/student/login", label: messages.student.loginTitle },
    ],
  },
  {
    title: messages.qa.cards.seriesHostPaced.title,
    description: messages.qa.cards.seriesHostPaced.description,
    links: [
      { href: "/admin/series", label: messages.adminShell.nav.series },
      { href: "/student/login", label: messages.student.loginTitle },
    ],
  },
  {
    title: messages.qa.cards.studentLogin.title,
    description: messages.qa.cards.studentLogin.description,
    links: [
      { href: "/student/login", label: messages.student.loginTitle },
      { href: "/student", label: messages.student.dashboard },
    ],
  },
  {
    title: messages.qa.cards.qrJoin.title,
    description: messages.qa.cards.qrJoin.description,
    links: [
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
      { href: "/play", label: messages.sessions.playLink },
    ],
  },
  {
    title: messages.qa.cards.presenter.title,
    description: messages.qa.cards.presenter.description,
    links: [
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
    ],
  },
  {
    title: messages.qa.cards.csvExport.title,
    description: messages.qa.cards.csvExport.description,
    links: [
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
      { href: "/admin/series", label: messages.adminShell.nav.series },
    ],
  },
  {
    title: messages.qa.cards.personalResults.title,
    description: messages.qa.cards.personalResults.description,
    links: [
      { href: "/admin/sessions", label: messages.adminShell.nav.sessions },
      { href: "/play", label: messages.sessions.playLink },
    ],
  },
  {
    title: messages.qa.cards.cache.title,
    description: messages.qa.cards.cache.description,
    links: [
      { href: "/admin/setup-check", label: messages.adminShell.nav.setupCheck },
    ],
  },
];

export default function AdminQaPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.qa.title}</h1>
          <p className="mt-2 text-slate-600">{messages.qa.description}</p>
        </div>
        <Link
          href="/admin"
          className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
        >
          {messages.common.backToAdmin}
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {qaCards.map((card, index) => (
          <article key={card.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-teal-50 text-sm font-black text-teal-800">
                {index + 1}
              </span>
              <div>
                <h2 className="text-lg font-bold">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {card.links.map((link) => (
                <Link
                  key={`${card.title}-${link.href}`}
                  href={link.href}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
