"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { messages } from "@/lib/messages";

type HostPacedPhase =
  | "LOBBY"
  | "STARTING"
  | "QUESTION"
  | "QUESTION_LOCKED"
  | "REVEAL"
  | "LEADERBOARD"
  | "FINISHED";

type ParticipantSession = {
  participantId: string;
  participantToken: string;
  displayName: string;
};

type StudentQuestion = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect?: boolean;
  }>;
  correctAnswer?: string;
  explanation?: string | null;
};

type HostPacedStudentLive = {
  code: string;
  mode: "HOST_PACED";
  status: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
  phase: HostPacedPhase;
  testTitle: string;
  sessionLabel: string;
  currentQuestionIndex: number;
  questionCount: number;
  currentQuestionForStudent: StudentQuestion | null;
  hasAnsweredCurrentQuestion: boolean;
  remainingSeconds: number | null;
  myLastAnswerResult: {
    submitted: true;
    isCorrect?: boolean | null;
    points?: number;
    answer?: string;
    correctAnswer?: string;
    explanation?: string | null;
  } | null;
  leaderboardTopIfAllowed: Array<{
    id: string;
    rank: number;
    displayName: string;
    score: number;
    correctCount: number;
  }>;
  myRank: number | null;
  myScore: number;
  participantCount: number;
  serverTime: string;
};

type LiveApiResponse =
  | {
      ok: true;
      data: HostPacedStudentLive;
    }
  | { ok: false; error: string };

type SubmitApiResponse =
  | {
      ok: true;
      data: {
        grading: {
          isCorrect: boolean | null;
        };
      };
    }
  | { ok: false; error: string };

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
        displayName: typeof parsed.displayName === "string" ? parsed.displayName : messages.play.player,
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

function answerPayload(question: StudentQuestion, value: string) {
  const selectedOption = question.options.find((option) => option.id === value);

  return selectedOption
    ? { optionId: selectedOption.id, value: selectedOption.optionText }
    : { value };
}

export function HostPacedGameClient({
  code,
  sessionId,
  initialLive,
}: {
  code: string;
  sessionId: string;
  initialLive: HostPacedStudentLive | null;
}) {
  const participantRaw = useSyncExternalStore(
    subscribeParticipantSession,
    () => readParticipantSessionRaw(code),
    () => "",
  );
  const participant = useMemo(() => parseParticipantSession(participantRaw), [participantRaw]);
  const [live, setLive] = useState<HostPacedStudentLive | null>(initialLive);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initialParticipant = parseParticipantSession(readParticipantSessionRaw(code));
    return initialParticipant ? readDraftAnswers(code, initialParticipant.participantId) : {};
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [startingCountdown, setStartingCountdown] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const lastPhase = useRef<HostPacedPhase | null>(initialLive?.phase ?? null);

  async function fetchLive() {
    if (!participant) {
      return;
    }

    try {
      const params = new URLSearchParams({
        participantId: participant.participantId,
        participantToken: participant.participantToken,
      });
      const response = await fetch(`/api/sessions/${code}/host-paced/student-live?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as LiveApiResponse;

      if (result.ok) {
        setLive((current) => {
          if (
            current &&
            current.phase === result.data.phase &&
            current.currentQuestionIndex === result.data.currentQuestionIndex &&
            current.remainingSeconds === result.data.remainingSeconds &&
            current.hasAnsweredCurrentQuestion === result.data.hasAnsweredCurrentQuestion
          ) {
            return current;
          }

          return result.data;
        });
      }
    } catch {
      // Student live polling is intentionally silent.
    }
  }

  useEffect(() => {
    if (!participant) {
      return;
    }

    const activeParticipant = participant;
    let stopped = false;

    async function poll() {
      if (stopped) {
        return;
      }

      try {
        const params = new URLSearchParams({
          participantId: activeParticipant.participantId,
          participantToken: activeParticipant.participantToken,
        });
        const response = await fetch(`/api/sessions/${code}/host-paced/student-live?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as LiveApiResponse;

        if (!stopped && result.ok) {
          setLive((current) => {
            if (
              current &&
              current.phase === result.data.phase &&
              current.currentQuestionIndex === result.data.currentQuestionIndex &&
              current.remainingSeconds === result.data.remainingSeconds &&
              current.hasAnsweredCurrentQuestion === result.data.hasAnsweredCurrentQuestion
            ) {
              return current;
            }

            return result.data;
          });
        }
      } catch {
        // Student live polling is intentionally silent.
      }
    }

    const interval = window.setInterval(poll, 2000);
    void poll();

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [code, participant]);

  useEffect(() => {
    if (!live?.phase) {
      return;
    }

    const previousPhase = lastPhase.current;
    lastPhase.current = live.phase;

    if (previousPhase === live.phase) {
      return;
    }

    if (live.phase === "STARTING") {
      const timers = [
        window.setTimeout(() => setStartingCountdown(3), 0),
        window.setTimeout(() => setStartingCountdown(2), 800),
        window.setTimeout(() => setStartingCountdown(1), 1600),
        window.setTimeout(() => setStartingCountdown(null), 2400),
      ];

      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    if (live.phase === "QUESTION") {
      startedAt.current = Date.now();
    }
  }, [live?.phase]);

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

  async function submitAnswer() {
    if (!participant || !live?.currentQuestionForStudent) {
      setError(messages.game.joinRequired);
      return;
    }

    const question = live.currentQuestionForStudent;
    const value = answers[question.id] ?? "";

    if (!value.trim()) {
      setError(messages.game.answerRequired);
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/answers/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          sessionId,
          code,
          participantId: participant.participantId,
          participantToken: participant.participantToken,
          questionId: question.id,
          answer: answerPayload(question, value),
          responseMs: startedAt.current ? Date.now() - startedAt.current : undefined,
          source: "MANUAL",
        }),
      });
      const result = (await response.json()) as SubmitApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      await fetchLive();
    } catch {
      setError(messages.api.answerSubmitFailed);
    } finally {
      setPending(false);
    }
  }

  if (!participant) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.joinRequiredTitle}</h2>
        <p className="mt-2 text-slate-600">{messages.game.joinRequiredDescription}</p>
        <Link href={`/play?code=${code}`} className="mt-4 inline-block font-semibold text-teal-800">
          {messages.game.enterDifferentCode}
        </Link>
      </section>
    );
  }

  if (!live) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-semibold">{messages.host.refreshing}</p>
      </section>
    );
  }

  if (live.phase === "LOBBY") {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.joinedTitle}</h2>
        <p className="mt-2 text-slate-600">
          {messages.game.joinedAs} <span className="font-semibold">{participant.displayName}</span>
        </p>
        <p className="mt-3 text-sm font-semibold text-teal-800">
          {messages.game.codeLabel}: {code}
        </p>
        <p className="mt-3 font-semibold">{live.testTitle}</p>
        <p className="mt-2 text-slate-600">{messages.game.lobbyDescription}</p>
        <Dots />
        <p className="mt-4 text-sm font-semibold text-teal-800">
          {live.participantCount} {messages.game.participantsLabel}
        </p>
      </section>
    );
  }

  if (live.phase === "STARTING") {
    return (
      <section className="rounded-md border border-teal-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-800">
          {messages.game.getReady}
        </p>
        <p className="mt-4 text-7xl font-black text-teal-800">{startingCountdown ?? 1}</p>
      </section>
    );
  }

  if (live.phase === "QUESTION") {
    return (
      <QuestionScreen
        live={live}
        answers={answers}
        pending={pending}
        error={error}
        onAnswer={setAnswer}
        onSubmit={submitAnswer}
      />
    );
  }

  if (live.phase === "QUESTION_LOCKED") {
    return (
      <section className="rounded-md border border-amber-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.game.answersLocked}</h2>
        <p className="mt-2 text-slate-600">{messages.game.waitingForNextQuestion}</p>
      </section>
    );
  }

  if (live.phase === "REVEAL") {
    return <RevealScreen live={live} />;
  }

  if (live.phase === "LEADERBOARD") {
    return <LeaderboardScreen live={live} />;
  }

  return (
    <section className="rounded-md border border-teal-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-2xl font-bold">{messages.game.finished}</h2>
      <p className="mt-2 text-slate-600">{messages.game.resultsReady}</p>
      <Link
        href={`/game/${code}/results`}
        className="mt-4 inline-flex rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
      >
        {messages.game.viewResults}
      </Link>
    </section>
  );
}

function Dots() {
  return (
    <div className="mt-3 flex items-center justify-center gap-1 text-teal-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-teal-600" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-teal-600 [animation-delay:120ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-teal-600 [animation-delay:240ms]" />
    </div>
  );
}

function QuestionScreen({
  live,
  answers,
  pending,
  error,
  onAnswer,
  onSubmit,
}: {
  live: HostPacedStudentLive;
  answers: Record<string, string>;
  pending: boolean;
  error: string;
  onAnswer: (questionId: string, value: string) => void;
  onSubmit: () => void;
}) {
  const question = live.currentQuestionForStudent;
  const answered = live.hasAnsweredCurrentQuestion;
  const timeIsUp = live.remainingSeconds !== null && live.remainingSeconds <= 0;

  if (!question) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-semibold">{messages.game.waitingForNextQuestion}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-teal-800">
            {messages.game.questionLabel} {live.currentQuestionIndex + 1} / {live.questionCount}
          </p>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800">
            {live.remainingSeconds ?? "-"}s
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-600 transition-all"
            style={{
              width:
                live.remainingSeconds === null
                  ? "0%"
                  : `${Math.max(0, Math.min(100, (live.remainingSeconds / 30) * 100))}%`,
            }}
          />
        </div>
        <h2 className="mt-5 text-2xl font-bold">{question.prompt}</h2>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {answered ? (
        <section className="rounded-md border border-teal-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold">{messages.game.submitted}</h2>
          <p className="mt-2 text-slate-600">{messages.game.waitingForOthers}</p>
        </section>
      ) : (
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <AnswerInput
            question={question}
            value={answers[question.id] ?? ""}
            disabled={timeIsUp || pending}
            onChange={(value) => onAnswer(question.id, value)}
          />
          {timeIsUp ? <p className="mt-3 text-sm font-semibold text-amber-700">{messages.game.timeIsUp}</p> : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={timeIsUp || pending}
            className="mt-4 rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? messages.game.submitting : messages.game.submitAnswer}
          </button>
        </article>
      )}
    </section>
  );
}

function AnswerInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: StudentQuestion;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (question.options.length > 0) {
    return (
      <div className="grid gap-3">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-3 text-sm hover:bg-slate-50"
          >
            <input
              type="radio"
              name={question.id}
              value={option.id}
              checked={value === option.id}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{option.optionText}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "NUMERIC") {
    return (
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    );
  }

  return (
    <textarea
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
    />
  );
}

function RevealScreen({ live }: { live: HostPacedStudentLive }) {
  const result = live.myLastAnswerResult;
  const question = live.currentQuestionForStudent;

  return (
    <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-2xl font-bold">
        {result?.isCorrect === true
          ? messages.game.correct
          : result?.isCorrect === false
            ? messages.game.incorrect
            : messages.game.submitted}
      </h2>
      <p className="text-lg font-semibold text-teal-800">
        {result?.points ?? 0} {messages.game.points}
      </p>
      {question?.correctAnswer ? (
        <p className="rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-900">
          {messages.results.correctAnswer}: {question.correctAnswer}
        </p>
      ) : null}
      {question?.explanation ? <p className="text-sm leading-6 text-slate-600">{question.explanation}</p> : null}
    </section>
  );
}

function LeaderboardScreen({ live }: { live: HostPacedStudentLive }) {
  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-5 text-center shadow-sm">
        <h2 className="text-2xl font-bold">{messages.results.leaderboard}</h2>
        <p className="mt-2 text-slate-600">{messages.game.waitingForNextQuestion}</p>
        <p className="mt-3 font-semibold text-teal-800">
          {messages.results.score}: {live.myScore}
          {live.myRank ? ` - ${messages.results.rank} ${live.myRank}` : ""}
        </p>
      </div>
      {live.leaderboardTopIfAllowed.length > 0 ? (
        <div className="grid gap-2">
          {live.leaderboardTopIfAllowed.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
            >
              <span className="font-black text-teal-800">#{row.rank}</span>
              <span className="font-semibold">{row.displayName}</span>
              <span className="font-black">{row.score}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
