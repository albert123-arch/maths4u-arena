"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { messages } from "@/lib/messages";

type AdminSession = {
  id: string;
  code: string;
  status: string;
  testVersion: {
    title: string;
    test: {
      title: string;
      subject?: string;
    };
  };
  _count: {
    participants: number;
    answers: number;
  };
};

type ApiResponse =
  | {
      ok: true;
      data: AdminSession[];
    }
  | { ok: false; error: string };

export function AdminSessionsList({ initialSessions }: { initialSessions: AdminSession[] }) {
  const [sessions, setSessions] = useState(initialSessions);

  useEffect(() => {
    let stopped = false;

    async function pollSessions() {
      try {
        const response = await fetch("/api/sessions", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as ApiResponse;

        if (!stopped && result.ok) {
          setSessions(result.data);
        }
      } catch {
        // Admin list polling is best-effort.
      }
    }

    const interval = window.setInterval(pollSessions, 10000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);

  if (sessions.length === 0) {
    return <p className="p-5 text-sm text-slate-600">{messages.sessions.empty}</p>;
  }

  return (
    <div className="divide-y divide-slate-200">
      {sessions.map((session) => (
        <article
          key={session.id}
          className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{session.code}</h2>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {session.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {session.testVersion.test.title} - {session.testVersion.title}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {session._count.participants} {messages.host.participants.toLowerCase()} -{" "}
              {session._count.answers} {messages.host.answers.toLowerCase()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/host/${session.code}`}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {messages.sessions.hostLink}
            </Link>
            <Link
              href={`/game/${session.code}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {messages.sessions.gameLink}
            </Link>
            <Link
              href={`/admin/sessions/${session.code}/results`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {messages.sessions.resultsLink}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
