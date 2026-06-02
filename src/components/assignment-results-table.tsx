"use client";

import Link from "next/link";
import { useState } from "react";

import { messages } from "@/lib/messages";

type AssignmentResultRow = {
  id: string;
  studentName: string;
  username: string;
  classTitle: string;
  status: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  answeredCount: number;
  startedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
};

function csvCell(value: string | number | null) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function assignmentCsvFilename(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `maths4u-assignment-${slug || "assignment"}-results.csv`;
}

export function AssignmentResultsTable({
  assignmentId,
  assignmentTitle,
  rows,
}: {
  assignmentId: string;
  assignmentTitle: string;
  rows: AssignmentResultRow[];
}) {
  const [exporting, setExporting] = useState(false);

  function downloadCsv() {
    if (exporting) {
      return;
    }

    setExporting(true);
    const csvRows = [
      [
        "Student name",
        "Username",
        "Class",
        "Status",
        "Score",
        "Max score",
        "Percentage",
        "Correct count",
        "Answered count",
        "Started at",
        "Submitted at",
        "Graded at",
      ],
      ...rows.map((row) => [
        row.studentName,
        row.username,
        row.classTitle,
        row.status,
        row.score,
        row.maxScore,
        `${row.percentage}%`,
        row.correctCount,
        row.answeredCount,
        row.startedAt,
        row.submittedAt,
        row.gradedAt,
      ]),
    ];
    const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = assignmentCsvFilename(assignmentTitle);
    link.click();
    URL.revokeObjectURL(url);
    window.setTimeout(() => setExporting(false), 300);
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Submissions</h2>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={exporting}
          className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
        >
          {exporting ? messages.common.exporting : messages.common.downloadCsv}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">No submissions have been created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Correct</th>
                <th className="px-4 py-3 font-semibold">Answered</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-xs text-slate-500">{row.username}</p>
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">
                    {row.score} / {row.maxScore} ({row.percentage}%)
                  </td>
                  <td className="px-4 py-3">{row.correctCount}</td>
                  <td className="px-4 py-3">{row.answeredCount}</td>
                  <td className="px-4 py-3">
                    {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/teacher/assignments/${assignmentId}/submissions/${row.id}`}
                      className="font-semibold text-teal-800 hover:text-teal-950"
                    >
                      View submission
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
