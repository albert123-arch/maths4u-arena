"use client";

import { useCallback, useEffect, useState } from "react";

import { messages } from "@/lib/messages";

import { RunAgainButton } from "./run-again-button";

type ResultParticipant = {
  id: string;
  rank: number;
  displayName: string;
  teamId: string | null;
  teamName: string;
  teamRank: number | null;
  totalScore: number;
  answered: number;
  correct: number;
  correctness: number;
  percentage: number;
  status: string;
  lastAnswerPrompt: string | null;
};

type TeamLeaderboardRow = {
  id: string;
  rank: number;
  name: string;
  score: number;
  memberCount: number;
  correctCount: number;
  answeredCount: number;
  averagePercentage: number;
};

type ResultData = {
  code: string;
  status: string;
  mode: string;
  testTitle: string;
  sessionLabel: string;
  testVersionId: string;
  settingsJson: string | null;
  teamMode: boolean;
  totalPossible: number;
  participantCount: number;
  submittedCount: number;
  averageScore: number;
  lastUpdated: string;
  participants: ResultParticipant[];
  teamLeaderboard: TeamLeaderboardRow[];
};

type ApiResponse =
  | {
      ok: true;
      data: ResultData;
    }
  | { ok: false; error: string };

function csvCell(value: string | number | null) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function SessionResultsTable({ initialData }: { initialData: ResultData }) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  function downloadResults() {
    if (exporting) {
      return;
    }

    setExporting(true);
    const rows = [
      [
        messages.results.rank,
        messages.results.participant,
        messages.play.team,
        messages.results.teamRank,
        messages.results.score,
        messages.results.totalPossible,
        messages.results.answers,
        messages.results.correct,
        messages.results.percentage,
        messages.host.status,
      ],
      ...data.participants.map((participant) => [
        participant.rank,
        participant.displayName,
        participant.teamName,
        participant.teamRank ?? "",
        participant.totalScore,
        data.totalPossible,
        participant.answered,
        participant.correct,
        `${participant.percentage}%`,
        participant.status,
      ]),
    ];
    const teamRows = data.teamMode
      ? [
          [],
          [messages.results.teamLeaderboard],
          [
            messages.results.rank,
            messages.play.team,
            messages.results.teamScore,
            messages.results.members,
            messages.results.correct,
            messages.results.answers,
            messages.results.percentage,
          ],
          ...data.teamLeaderboard.map((team) => [
            team.rank,
            team.name,
            team.score,
            team.memberCount,
            team.correctCount,
            team.answeredCount,
            `${team.averagePercentage}%`,
          ]),
        ]
      : [];
    const csv = [...rows, ...teamRows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `maths4u-arena-session-${data.code}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
    window.setTimeout(() => setExporting(false), 300);
  }

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
            <p className="mt-2 w-fit rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {data.mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic}
            </p>
            <p className="mt-2 w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {data.teamMode ? messages.sessions.teamBadge : messages.sessions.individualBadge}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadResults}
              disabled={exporting}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            >
              {exporting ? messages.common.exporting : messages.results.downloadResults}
            </button>
            <button
              type="button"
              onClick={refreshResults}
              disabled={pending}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? messages.host.refreshing : messages.host.refreshNow}
            </button>
            <RunAgainButton
              testVersionId={data.testVersionId}
              mode={data.mode}
              settingsJson={data.settingsJson}
              compact
            />
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
      {data.teamMode ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-lg font-bold">{messages.results.teamLeaderboard}</h3>
          </div>
          {data.teamLeaderboard.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.results.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{messages.results.rank}</th>
                    <th className="px-4 py-3 font-semibold">{messages.play.team}</th>
                    <th className="px-4 py-3 font-semibold">{messages.results.teamScore}</th>
                    <th className="px-4 py-3 font-semibold">{messages.results.members}</th>
                    <th className="px-4 py-3 font-semibold">{messages.results.correct}</th>
                    <th className="px-4 py-3 font-semibold">{messages.results.percentage}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.teamLeaderboard.map((team) => (
                    <tr key={team.id}>
                      <td className="px-4 py-3 font-bold text-teal-800">{team.rank}</td>
                      <td className="px-4 py-3 font-medium">{team.name}</td>
                      <td className="px-4 py-3 font-bold">{team.score}</td>
                      <td className="px-4 py-3">{team.memberCount}</td>
                      <td className="px-4 py-3">{team.correctCount}</td>
                      <td className="px-4 py-3">{team.averagePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-lg font-bold">{messages.results.individualLeaderboard}</h3>
        </div>
        {data.participants.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.results.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">{messages.results.rank}</th>
                  <th className="px-4 py-3 font-semibold">{messages.results.participant}</th>
                  {data.teamMode ? <th className="px-4 py-3 font-semibold">{messages.play.team}</th> : null}
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
                    <td className="px-4 py-3 font-bold text-teal-800">{participant.rank}</td>
                    <td className="px-4 py-3 font-medium">{participant.displayName}</td>
                    {data.teamMode ? (
                      <td className="px-4 py-3">
                        {participant.teamName || messages.results.unassigned}
                        {participant.teamRank ? (
                          <span className="ml-2 text-xs font-semibold text-slate-500">
                            #{participant.teamRank}
                          </span>
                        ) : null}
                      </td>
                    ) : null}
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
