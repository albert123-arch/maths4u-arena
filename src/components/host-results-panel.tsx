"use client";

import { useCallback, useEffect, useState } from "react";

import { messages } from "@/lib/messages";

type ResultParticipant = {
  id: string;
  rank: number;
  displayName: string;
  teamName: string;
  totalScore: number;
  correct: number;
  percentage: number;
  status: string;
};

type TeamLeaderboardRow = {
  id: string;
  rank: number;
  name: string;
  score: number;
  memberCount: number;
  correctCount: number;
  averagePercentage: number;
};

type ResultData = {
  code: string;
  status: string;
  testTitle: string;
  sessionLabel: string;
  teamMode: boolean;
  participantCount: number;
  submittedCount: number;
  averageScore: number;
  totalPossible: number;
  participants: ResultParticipant[];
  teamLeaderboard: TeamLeaderboardRow[];
};

type ApiResponse =
  | {
      ok: true;
      data: ResultData;
    }
  | { ok: false; error: string };

export function HostResultsPanel({ apiPath }: { apiPath: string }) {
  const [data, setData] = useState<ResultData | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");

  const loadResults = useCallback(async () => {
    setPending(true);
    setError("");

    try {
      const response = await fetch(apiPath, {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setData(result.data);
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }, [apiPath]);

  useEffect(() => {
    const initialTimer = window.setTimeout(loadResults, 0);

    const interval = window.setInterval(loadResults, 3000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [loadResults]);

  if (pending && !data) {
    return (
      <section className="rounded-md border border-slate-700 bg-slate-900 p-6 text-center">
        <p className="font-semibold text-slate-200">{messages.results.loadingPersonal}</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="rounded-md border border-red-400/40 bg-red-400/10 p-6 text-center">
        <h2 className="text-2xl font-bold text-red-100">{messages.results.unavailable}</h2>
        <p className="mt-2 text-sm text-red-100">{error}</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="grid gap-5 rounded-md border border-teal-500/40 bg-slate-900 p-5 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-200">
            {messages.host.resultsOnScreen}
          </p>
          <h2 className="mt-1 text-3xl font-black">{data.testTitle}</h2>
          {data.sessionLabel ? <p className="mt-1 text-sm font-semibold text-teal-100">{data.sessionLabel}</p> : null}
        </div>
        <button
          type="button"
          onClick={loadResults}
          disabled={pending}
          className="rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? messages.host.refreshing : messages.host.refreshNow}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label={messages.host.participants} value={data.participantCount} />
        <Metric label={messages.host.submitted} value={data.submittedCount} />
        <Metric label={messages.results.averageScore} value={data.averageScore} />
        <Metric label={messages.results.totalPossible} value={data.totalPossible} />
      </div>

      {data.teamMode && data.teamLeaderboard.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="text-xl font-bold text-teal-100">{messages.results.teamLeaderboard}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {data.teamLeaderboard.slice(0, 6).map((team) => (
              <article key={team.id} className="rounded-md border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-black text-teal-200">#{team.rank}</p>
                  <p className="text-2xl font-black">{team.score}</p>
                </div>
                <h4 className="mt-2 text-xl font-bold">{team.name}</h4>
                <p className="mt-1 text-sm text-slate-400">
                  {team.memberCount} {messages.results.members.toLowerCase()} - {team.correctCount}{" "}
                  {messages.results.correct.toLowerCase()} - {team.averagePercentage}%
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        <h3 className="text-xl font-bold">{messages.results.individualLeaderboard}</h3>
        {data.participants.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            {messages.results.empty}
          </p>
        ) : (
          <div className="grid gap-2">
            {data.participants.slice(0, 12).map((participant) => (
              <article
                key={participant.id}
                className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-slate-700 bg-slate-950 p-3"
              >
                <span className="text-xl font-black text-teal-200">#{participant.rank}</span>
                <div>
                  <p className="font-semibold">{participant.displayName}</p>
                  <p className="text-xs text-slate-400">
                    {participant.teamName ? `${participant.teamName} - ` : ""}
                    {participant.correct} {messages.results.correct.toLowerCase()} - {participant.percentage}%
                  </p>
                </div>
                <span className="text-xl font-black">{participant.totalScore}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-950 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
