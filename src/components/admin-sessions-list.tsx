"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { messages } from "@/lib/messages";

import { RunAgainButton } from "./run-again-button";

type SessionStatus = "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
type SessionFilter = "ALL" | SessionStatus;

type AdminSession = {
  id: string;
  code: string;
  status: SessionStatus;
  mode: string;
  createdAt: string;
  settingsJson: string | null;
  submittedCount: number;
  questionCount: number;
  settings: {
    label: string;
    teamMode: boolean;
  };
  testVersion: {
    id: string;
    title: string;
    test: {
      title: string;
      subject?: string | null;
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

const filters: Array<{ value: SessionFilter; label: string }> = [
  { value: "ALL", label: messages.sessions.filterAll },
  { value: "LOBBY", label: messages.sessions.filterLobby },
  { value: "RUNNING", label: messages.sessions.filterRunning },
  { value: "FINISHED", label: messages.sessions.filterFinished },
];

function statusBadge(status: SessionStatus) {
  if (status === "RUNNING") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "FINISHED") {
    return "bg-slate-200 text-slate-800";
  }

  if (status === "PAUSED") {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-amber-100 text-amber-800";
}

function modeLabel(mode: string) {
  if (mode === "CLASSIC") {
    return messages.sessions.modeClassic;
  }

  if (mode === "HOST_PACED") {
    return messages.sessions.modeHostPaced;
  }

  return mode;
}

export function AdminSessionsList({ initialSessions }: { initialSessions: AdminSession[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [filter, setFilter] = useState<SessionFilter>("ALL");

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

  const visibleSessions = useMemo(
    () =>
      filter === "ALL"
        ? sessions
        : sessions.filter((session) => session.status === filter),
    [filter, sessions],
  );

  if (sessions.length === 0) {
    return <p className="p-5 text-sm text-slate-600">{messages.sessions.empty}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
              filter === item.value
                ? "bg-slate-950 text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleSessions.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">{messages.sessions.empty}</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {visibleSessions.map((session) => (
            <article
              key={session.id}
              className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-[0.12em]">{session.code}</h2>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusBadge(session.status)}`}>
                    {session.status}
                  </span>
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                    {modeLabel(session.mode)}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {session.settings.teamMode ? messages.sessions.teamBadge : messages.sessions.individualBadge}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {session.testVersion.test.title}
                </p>
                {session.settings.label ? (
                  <p className="mt-1 text-sm text-slate-500">{session.settings.label}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>
                    {session._count.participants} {messages.host.participants.toLowerCase()}
                  </span>
                  <span>
                    {session.submittedCount} / {session._count.participants}{" "}
                    {messages.host.submitted.toLowerCase()}
                  </span>
                  <span>
                    {session.questionCount} {messages.host.questions.toLowerCase()}
                  </span>
                  <span>
                    {messages.sessions.createdAt}:{" "}
                    {new Date(session.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/host/${session.code}`}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 active:scale-[0.98]"
                >
                  {messages.sessions.hostLink}
                </Link>
                <Link
                  href={`/admin/sessions/${session.code}/results`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  {messages.sessions.resultsLink}
                </Link>
                <RunAgainButton
                  testVersionId={session.testVersion.id}
                  mode={session.mode}
                  settingsJson={session.settingsJson}
                  compact
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
