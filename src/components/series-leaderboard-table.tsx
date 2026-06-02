"use client";

import { messages } from "@/lib/messages";
import { slugify } from "@/lib/slug";
import { useState } from "react";

type LeaderboardRound = {
  id: string;
  title: string;
  roundNumber: number;
};

type LeaderboardRow = {
  rank: number;
  studentId: string;
  displayName: string;
  groupName: string | null;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  averagePercentage: number;
  roundScores: Array<{
    roundId: string;
    points: number;
  }>;
};

function csvCell(value: string | number | null) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function SeriesLeaderboardTable({
  seriesTitle,
  rounds,
  rows,
}: {
  seriesTitle: string;
  rounds: LeaderboardRound[];
  rows: LeaderboardRow[];
}) {
  const [exporting, setExporting] = useState(false);

  function downloadCsv() {
    if (exporting) {
      return;
    }

    setExporting(true);
    const header = [
      messages.results.rank,
      messages.results.participant,
      messages.student.group,
      ...rounds.map((round) => `${round.roundNumber}. ${round.title}`),
      messages.series.total,
      messages.results.correct,
      messages.results.answers,
      messages.series.averagePercentage,
    ];
    const csvRows = [
      header,
      ...rows.map((row) => [
        row.rank,
        row.displayName,
        row.groupName,
        ...rounds.map((round) => row.roundScores.find((score) => score.roundId === round.id)?.points ?? 0),
        row.totalScore,
        row.correctCount,
        row.answeredCount,
        `${row.averagePercentage}%`,
      ]),
    ];
    const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `maths4u-arena-series-${slugify(seriesTitle) || "series"}-leaderboard.csv`;
    link.click();
    URL.revokeObjectURL(url);
    window.setTimeout(() => setExporting(false), 300);
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">{messages.series.leaderboard}</h2>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={exporting}
          className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
        >
          {exporting ? messages.common.exporting : messages.series.downloadLeaderboard}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">{messages.series.noRegisteredStudents}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">{messages.results.rank}</th>
                <th className="px-4 py-3 font-semibold">{messages.results.participant}</th>
                <th className="px-4 py-3 font-semibold">{messages.student.group}</th>
                {rounds.map((round) => (
                  <th key={round.id} className="px-4 py-3 font-semibold">
                    {round.roundNumber}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">{messages.series.total}</th>
                <th className="px-4 py-3 font-semibold">{messages.results.correct}</th>
                <th className="px-4 py-3 font-semibold">{messages.series.averagePercentage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.studentId}>
                  <td className="px-4 py-3 font-bold text-teal-800">{row.rank}</td>
                  <td className="px-4 py-3 font-medium">{row.displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.groupName ?? ""}</td>
                  {rounds.map((round) => (
                    <td key={round.id} className="px-4 py-3">
                      {row.roundScores.find((score) => score.roundId === round.id)?.points ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 font-semibold">{row.totalScore}</td>
                  <td className="px-4 py-3">{row.correctCount}</td>
                  <td className="px-4 py-3">{row.averagePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
