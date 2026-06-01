"use client";

import { useEffect, useState } from "react";

import { messages } from "@/lib/messages";

type ResultParticipant = {
  id: string;
  displayName: string;
  totalScore: number;
  answered: number;
  correctness: number;
  lastAnswerPrompt: string | null;
};

type ResultData = {
  code: string;
  status: string;
  testTitle: string;
  totalPossible: number;
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

  useEffect(() => {
    let stopped = false;

    async function pollResults() {
      try {
        const response = await fetch(`/api/admin/sessions/${data.code}/results`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as ApiResponse;

        if (!stopped && result.ok) {
          setData(result.data);
        }
      } catch {
        // Results polling is best-effort and should not disrupt the page.
      }
    }

    const interval = window.setInterval(pollResults, 3000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [data.code]);

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">{messages.host.status}</p>
            <p className="mt-1 text-xl font-bold">{data.status}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.host.participants}</p>
            <p className="mt-1 text-xl font-bold">{data.participants.length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.results.totalPossible}</p>
            <p className="mt-1 text-xl font-bold">{data.totalPossible}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">{messages.results.exportTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{messages.results.exportPlaceholder}</p>
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
                  <th className="px-4 py-3 font-semibold">{messages.results.correctness}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.lastAnswer}</th>
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
                    <td className="px-4 py-3">{participant.correctness}%</td>
                    <td className="px-4 py-3 text-slate-600">
                      {participant.lastAnswerPrompt
                        ? participant.lastAnswerPrompt.slice(0, 80)
                        : messages.results.noAnswers}
                    </td>
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
