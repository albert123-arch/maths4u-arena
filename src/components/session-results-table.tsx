"use client";

import { useCallback, useEffect, useState } from "react";

import { messages } from "@/lib/messages";

import { RunAgainButton } from "./run-again-button";

type ResultParticipant = {
  id: string;
  displayName: string;
  totalScore: number;
  answered: number;
  correct: number;
  correctness: number;
  percentage: number;
  status: string;
  lastAnswerPrompt: string | null;
};

type ResultData = {
  code: string;
  status: string;
  testTitle: string;
  sessionLabel: string;
  testVersionId: string;
  settingsJson: string | null;
  totalPossible: number;
  participantCount: number;
  submittedCount: number;
  averageScore: number;
  lastUpdated: string;
  participants: ResultParticipant[];
};

type ApiResponse =
  | {
      ok: true;
      data: ResultData;
    }
  | { ok: false; error: string };

export function SessionResultsTable({ initialData }: { initialData: ResultData }) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState(false);

  const refreshResults = useCallback(async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/sessions/${data.code}/results`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as ApiResponse;

      if (result.ok) {
        setData((current) => ({
          ...result.data,
          testVersionId: current.testVersionId,
          settingsJson: current.settingsJson,
        }));
      }
    } catch {
      // Results refresh is best-effort and should not disrupt the page.
    } finally {
      setPending(false);
    }
  }, [data.code]);

  useEffect(() => {
    if (data.status !== "RUNNING") {
      return;
    }

    const interval = window.setInterval(refreshResults, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [data.status, refreshResults]);

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">{data.testTitle}</h2>
            {data.sessionLabel ? <p className="mt-1 text-sm text-slate-600">{data.sessionLabel}</p> : null}
            <p className="mt-1 text-sm font-semibold text-teal-800">
              {messages.game.codeLabel}: {data.code}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshResults}
              disabled={pending}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? messages.host.refreshing : messages.host.refreshNow}
            </button>
            <RunAgainButton testVersionId={data.testVersionId} settingsJson={data.settingsJson} compact />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          <div>
            <p className="text-sm text-slate-500">{messages.host.status}</p>
            <p className="mt-1 text-xl font-bold">{data.status}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.host.participants}</p>
            <p className="mt-1 text-xl font-bold">{data.participantCount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.host.submitted}</p>
            <p className="mt-1 text-xl font-bold">{data.submittedCount}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.results.averageScore}</p>
            <p className="mt-1 text-xl font-bold">{data.averageScore}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.results.lastUpdated}</p>
            <p className="mt-1 text-sm font-semibold">{new Date(data.lastUpdated).toLocaleTimeString()}</p>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {data.participants.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.results.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">{messages.results.participant}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.score}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.answers}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.correct}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.correctness}</th>
                  <th className="px-4 py-3 font-semibold">{messages.host.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.participants.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-4 py-3 font-medium">{participant.displayName}</td>
                    <td className="px-4 py-3">
                      {participant.totalScore} / {data.totalPossible}
                    </td>
                    <td className="px-4 py-3">{participant.answered}</td>
                    <td className="px-4 py-3">{participant.correct}</td>
                    <td className="px-4 py-3">{participant.percentage}%</td>
                    <td className="px-4 py-3 text-slate-600">{participant.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
