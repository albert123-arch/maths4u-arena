import Link from "next/link";

import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage() {
  const series = await prisma.series.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          registrations: true,
          rounds: true,
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.series.title}</h1>
          <p className="mt-2 text-slate-600">{messages.series.description}</p>
        </div>
        <Link
          href="/admin/series/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          {messages.series.createButton}
        </Link>
      </div>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold">{messages.series.listTitle}</h2>
        </div>
        {series.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.series.empty}</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {series.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {item._count.registrations} {messages.series.registrations.toLowerCase()} -{" "}
                    {item._count.rounds} {messages.series.rounds.toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/series/${item.id}`}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {messages.common.open}
                  </Link>
                  <Link
                    href={`/admin/series/${item.id}/leaderboard`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    {messages.series.leaderboard}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
