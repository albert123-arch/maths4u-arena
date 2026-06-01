"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";

import { messages } from "@/lib/messages";

type Option = {
  id: string;
  optionText: string;
};

type Question = {
  id: string;
  type: string;
  prompt: string;
  sortOrder: number;
  points: number;
  options: Option[];
};

type ApiResponse =
  | {
      ok: true;
      data: {
        grading: {
          isCorrect: boolean | null;
        };
      };
    }
  | { ok: false; error: string };

type ParticipantSession = {
  participantId: string;
  participantToken: string;
};

function readParticipantSessionRaw(code: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(`maths4u_participant_${code}`) ?? "";
}

function parseParticipantSession(stored: string): ParticipantSession | null {
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<ParticipantSession>;

    if (parsed.participantId && parsed.participantToken) {
      return {
        participantId: parsed.participantId,
        participantToken: parsed.participantToken,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function subscribeParticipantSession(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);

  return () => window.removeEventListener("storage", callback);
}

export function ClassicGameClient({
  code,
  sessionId,
  questions,
}: {
  code: string;
  sessionId: string;
  questions: Question[];
}) {
  const startedAt = useRef<number | null>(null);
  const participantRaw = useSyncExternalStore(
    subscribeParticipantSession,
    () => readParticipantSessionRaw(code),
    () => "",
  );
  const participant = useMemo(
    () => parseParticipantSession(participantRaw),
    [participantRaw],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean | null>>({});
  const [pendingQuestionId, setPendingQuestionId] = useState("");
  const [error, setError] = useState("");
  const completedCount = Object.keys(submitted).length;
  const isComplete = questions.length > 0 && completedCount === questions.length;
  const orderedQuestions = useMemo(
    () => [...questions].sort((left, right) => left.sortOrder - right.sortOrder),
    [questions],
  );

  function setAnswer(questionId: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  async function submit(question: Question) {
    if (!participant) {
      setError(messages.game.joinRequired);
      return;
    }

    const selected = answers[question.id] ?? "";

    if (!selected.trim()) {
      setError(messages.game.answerRequired);
      return;
    }

    const selectedOption = question.options.find((option) => option.id === selected);
    startedAt.current ??= Date.now();
    setPendingQuestionId(question.id);
    setError("");

    const response = await fetch("/api/answers/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        code,
        participantId: participant.participantId,
        participantToken: participant.participantToken,
        questionId: question.id,
        answer: selectedOption
          ? { optionId: selectedOption.id, value: selectedOption.optionText }
          : { value: selected },
        responseMs: Date.now() - startedAt.current,
      }),
    });
    const result = (await response.json()) as ApiResponse;
    setPendingQuestionId("");

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSubmitted((current) => ({
      ...current,
      [question.id]: result.data.grading.isCorrect,
    }));
  }

  if (!participant) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.joinRequiredTitle}</h2>
        <p className="mt-2 text-slate-600">{messages.game.joinRequiredDescription}</p>
        <Link href="/play" className="mt-4 inline-block font-semibold text-teal-800 hover:text-teal-950">
          {messages.game.enterDifferentCode}
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{messages.game.runningTitle}</h2>
          <p className="text-sm text-slate-600">
            {completedCount} / {questions.length} {messages.game.completedLabel}
          </p>
        </div>
        {isComplete ? (
          <span className="rounded-md bg-teal-100 px-3 py-2 text-sm font-semibold text-teal-900">
            {messages.game.completeTitle}
          </span>
        ) : null}
      </div>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
      {isComplete ? (
        <section className="rounded-md border border-teal-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold">{messages.game.completeTitle}</h2>
          <p className="mt-2 text-slate-600">{messages.game.completeDescription}</p>
        </section>
      ) : null}
      {orderedQuestions.map((question, index) => {
        const isSubmitted = question.id in submitted;
        const result = submitted[question.id];

        return (
          <article key={question.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">
                {messages.game.questionLabel} {index + 1} - {question.points}{" "}
                {question.points === 1 ? messages.game.point : messages.game.points}
              </p>
              {isSubmitted ? (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {result === true
                    ? messages.game.correct
                    : result === false
                      ? messages.game.incorrect
                      : messages.game.submitted}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-semibold">{question.prompt}</h3>
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
                      disabled={isSubmitted}
                    />
                    <span>{option.optionText}</span>
                  </label>
                ))
              ) : question.type === "NUMERIC" ? (
                <input
                  type="number"
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  disabled={isSubmitted}
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                />
              ) : (
                <textarea
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  disabled={isSubmitted}
                  className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => submit(question)}
              disabled={isSubmitted || pendingQuestionId === question.id}
              className="mt-4 rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {pendingQuestionId === question.id ? messages.game.submitting : messages.game.submitAnswer}
            </button>
          </article>
        );
      })}
    </section>
  );
}
