"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ReviewAnswer = {
  id: string;
  questionPrompt: string;
  answerText: string;
  points: number;
  feedback: string | null;
};

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function AssignmentSubmissionReviewForm({
  assignmentId,
  submissionId,
  initialFeedback,
  answers,
}: {
  assignmentId: string;
  submissionId: string;
  initialFeedback: string;
  answers: ReviewAnswer[];
}) {
  const router = useRouter();
  const [teacherFeedback, setTeacherFeedback] = useState(initialFeedback);
  const [status, setStatus] = useState<"GRADED" | "RETURNED">("GRADED");
  const [answerRows, setAnswerRows] = useState(answers);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function setAnswerValue(id: string, field: "points" | "feedback", value: string) {
    setAnswerRows((current) =>
      current.map((answer) =>
        answer.id === id
          ? {
              ...answer,
              [field]: field === "points" ? Number(value || 0) : value,
            }
          : answer,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/teacher/assignments/${assignmentId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherFeedback,
            status,
            answers: answerRows.map((answer) => ({
              id: answer.id,
              points: answer.points,
              feedback: answer.feedback,
            })),
          }),
        },
      );
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(status === "RETURNED" ? "Submission returned." : "Submission graded.");
      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Teacher feedback</h2>
        <textarea
          value={teacherFeedback}
          onChange={(event) => setTeacherFeedback(event.target.value)}
          className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          placeholder="Write feedback for the student."
        />
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:max-w-xs">
          Review status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "GRADED" | "RETURNED")}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="GRADED">Graded</option>
            <option value="RETURNED">Returned</option>
          </select>
        </label>
      </section>
      <section className="grid gap-3">
        {answerRows.map((answer, index) => (
          <article key={answer.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Question {index + 1}</p>
            <h3 className="mt-1 font-semibold">{answer.questionPrompt}</h3>
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              Student answer: {answer.answerText || "-"}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Points
                <input
                  type="number"
                  min="0"
                  value={answer.points}
                  onChange={(event) => setAnswerValue(answer.id, "points", event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Answer feedback
                <input
                  value={answer.feedback ?? ""}
                  onChange={(event) => setAnswerValue(answer.id, "feedback", event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>
          </article>
        ))}
      </section>
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? messages.common.saving : "Save review"}
      </button>
    </form>
  );
}
