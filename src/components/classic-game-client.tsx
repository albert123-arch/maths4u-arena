"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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

type LiveSessionData = {
  status: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
  participantCount: number;
  answerCount: number;
  serverTime: string;
};

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

function draftAnswerKey(code: string, participantId: string) {
  return `maths4u_arena_answers_${code}_${participantId}`;
}

function readDraftAnswers(code: string, participantId: string) {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = localStorage.getItem(draftAnswerKey(code, participantId));

  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function saveDraftAnswers(code: string, participantId: string, answers: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(draftAnswerKey(code, participantId), JSON.stringify(answers));
}

function isFormElementFocused() {
  if (typeof document === "undefined") {
    return false;
  }

  const activeElement = document.activeElement;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  );
}

export function ClassicGameClient({
  code,
  sessionId,
  initialStatus,
  initialParticipantCount,
  initialAnswerCount,
  questions,
}: {
  code: string;
  sessionId: string;
  initialStatus: LiveSessionData["status"];
  initialParticipantCount: number;
  initialAnswerCount: number;
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
  const [live, setLive] = useState<LiveSessionData>({
    status: initialStatus,
    participantCount: initialParticipantCount,
    answerCount: initialAnswerCount,
    serverTime: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initialParticipant = parseParticipantSession(readParticipantSessionRaw(code));
    return initialParticipant ? readDraftAnswers(code, initialParticipant.participantId) : {};
  });
  const [submitted, setSubmitted] = useState<Record<string, boolean | null>>({});
  const [pendingQuestionId, setPendingQuestionId] = useState("");
  const [error, setError] = useState("");
  const completedCount = Object.keys(submitted).length;
  const isComplete = questions.length > 0 && completedCount === questions.length;
  const orderedQuestions = useMemo(
    () => [...questions].sort((left, right) => left.sortOrder - right.sortOrder),
    [questions],
  );

  useEffect(() => {
    if (!participant) {
      return;
    }

    let stopped = false;
    const intervalMs = live.status === "LOBBY" ? 2000 : 5000;

    async function pollLiveStatus() {
      try {
        const response = await fetch(`/api/sessions/${code}/live`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LiveSessionData;

        if (stopped) {
          return;
        }

        setLive((current) => {
          if (
            current.status === "RUNNING" &&
            data.status !== "FINISHED" &&
            isFormElementFocused()
          ) {
            return current;
          }

          if (
            current.status === data.status &&
            current.participantCount === data.participantCount &&
            current.answerCount === data.answerCount
          ) {
            return current;
          }

          return data;
        });
      } catch {
        // Keep the current game state if a silent background poll fails.
      }
    }

    const interval = window.setInterval(pollLiveStatus, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [code, live.status, participant]);

  function setAnswer(questionId: string, value: string) {
    startedAt.current ??= Date.now();
    setAnswers((current) => {
      const next = {
        ...current,
        [questionId]: value,
      };

      if (participant) {
        saveDraftAnswers(code, participant.participantId, next);
      }

      return next;
    });
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

  if (!participant && live.status === "FINISHED") {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.finished}</h2>
      </section>
    );
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

  if (live.status === "LOBBY") {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.lobbyTitle}</h2>
        <p className="mt-2 text-slate-600">{messages.game.lobbyDescription}</p>
        <p className="mt-4 text-sm font-semibold text-teal-800">
          {live.participantCount} {messages.game.participantsLabel}
        </p>
      </section>
    );
  }

  if (live.status === "PAUSED") {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.paused}</h2>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
        {messages.game.noQuestions}
      </p>
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
      {live.status === "FINISHED" ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
          {messages.game.finished}
        </p>
      ) : null}
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
                      disabled={isSubmitted || live.status === "FINISHED"}
                    />
                    <span>{option.optionText}</span>
                  </label>
                ))
              ) : question.type === "NUMERIC" ? (
                <input
                  type="number"
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  disabled={isSubmitted || live.status === "FINISHED"}
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                />
              ) : (
                <textarea
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  disabled={isSubmitted || live.status === "FINISHED"}
                  className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => submit(question)}
              disabled={isSubmitted || pendingQuestionId === question.id || live.status === "FINISHED"}
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
