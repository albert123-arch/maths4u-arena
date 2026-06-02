"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { messages } from "@/lib/messages";

type AssignmentQuestion = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  options: Array<{
    id: string;
    optionText: string;
  }>;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        startedAt?: string | null;
        status?: string;
      };
    }
  | { ok: false; error: string };

function draftKey(assignmentId: string, studentId: string) {
  return `maths4u_assignment_answers_${assignmentId}_${studentId}`;
}

function readDraft(assignmentId: string, studentId: string) {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(draftKey(assignmentId, studentId));
    const parsed = stored ? JSON.parse(stored) : {};

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function saveDraft(assignmentId: string, studentId: string, answers: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(draftKey(assignmentId, studentId), JSON.stringify(answers));
}

export function AssignmentWorkClient({
  assignmentId,
  studentId,
  title,
  type,
  dueAt,
  timeLimitMinutes,
  initialStartedAt,
  questions,
}: {
  assignmentId: string;
  studentId: string;
  title: string;
  type: string;
  dueAt: string | null;
  timeLimitMinutes: number | null;
  initialStartedAt: string | null;
  questions: AssignmentQuestion[];
}) {
  const router = useRouter();
  const submitStarted = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    readDraft(assignmentId, studentId),
  );
  const [startedAt, setStartedAt] = useState(initialStartedAt);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [startError, setStartError] = useState("");
  const [error, setError] = useState("");
  const answeredCount = useMemo(
    () => questions.filter((question) => (answers[question.id] ?? "").trim()).length,
    [answers, questions],
  );

  useEffect(() => {
    let stopped = false;

    async function startAssignment() {
      try {
        const response = await fetch(`/api/student/assignments/${assignmentId}/start`, {
          method: "POST",
        });
        const result = (await response.json()) as ApiResponse;

        if (stopped) {
          return;
        }

        if (!result.ok) {
          setStartError(result.error);
          return;
        }

        if (result.data.startedAt) {
          setStartedAt(result.data.startedAt);
        }
      } catch {
        if (!stopped) {
          setStartError(messages.api.unknownError);
        }
      }
    }

    void startAssignment();

    return () => {
      stopped = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (!timeLimitMinutes || !startedAt) {
      return;
    }

    const started = new Date(startedAt).getTime();
    const limitMs = timeLimitMinutes * 60_000;

    function tick() {
      const remaining = Math.max(0, Math.ceil((started + limitMs - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    }

    const initialTimer = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [startedAt, timeLimitMinutes]);

  useEffect(() => {
    if (remainingSeconds !== 0 || submitStarted.current) {
      return;
    }

    void submitAssignment("AUTO");
    // submitAssignment intentionally reads the current answer state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((current) => {
      const next = {
        ...current,
        [questionId]: value,
      };

      saveDraft(assignmentId, studentId, next);
      return next;
    });
  }

  async function submitAssignment(source: "MANUAL" | "AUTO" = "MANUAL") {
    if (pending || submitStarted.current) {
      return;
    }

    submitStarted.current = true;
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/student/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => {
            const value = answers[question.id] ?? "";
            const option = question.options.find((item) => item.id === value);

            return {
              questionId: question.id,
              answer: option ? { optionId: option.id, value: option.optionText } : { value },
            };
          }),
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        submitStarted.current = false;
        return;
      }

      localStorage.removeItem(draftKey(assignmentId, studentId));
      router.push(`/student/assignments/${assignmentId}/results`);
    } catch {
      setError(messages.api.assignmentSubmitFailed);
      submitStarted.current = false;
    } finally {
      setPending(false);
    }

    if (source === "AUTO") {
      setError(messages.game.timeIsUp);
    }
  }

  if (startError) {
    return (
      <section className="rounded-md border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-800">
        {startError}
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-800">{type.replace("_", " ")}</p>
            <h1 className="mt-1 text-3xl font-bold">{title}</h1>
            {dueAt ? (
              <p className="mt-2 text-sm text-slate-600">Due: {new Date(dueAt).toLocaleString()}</p>
            ) : null}
          </div>
          <div className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {answeredCount} / {questions.length} answered
          </div>
        </div>
        {remainingSeconds !== null ? (
          <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            Time remaining: {Math.floor(remainingSeconds / 60)}:
            {String(remainingSeconds % 60).padStart(2, "0")}
          </p>
        ) : null}
      </section>

      {questions.map((question, index) => (
        <article key={question.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Question {index + 1} - {question.points} {question.points === 1 ? "point" : "points"}
          </p>
          <h2 className="mt-2 text-lg font-semibold">{question.prompt}</h2>
          <div className="mt-4 grid gap-3">
            {question.options.length > 0 ? (
              question.options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                  />
                  <span>{option.optionText}</span>
                </label>
              ))
            ) : question.type === "TRUE_FALSE" ? (
              ["True", "False"].map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={value}
                    checked={answers[question.id] === value}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                  />
                  <span>{value}</span>
                </label>
              ))
            ) : question.type === "NUMERIC" ? (
              <input
                type="number"
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            ) : (
              <textarea
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            )}
          </div>
        </article>
      ))}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => submitAssignment()}
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? messages.student.submittingAssignment : messages.student.submitAssignment}
      </button>
    </div>
  );
}
