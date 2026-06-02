"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { messages } from "@/lib/messages";

type StoredParticipant = {
  participantId: string;
  participantToken: string;
  displayName: string;
};

type PersonalResults = {
  code: string;
  mode: string;
  testTitle: string;
  sessionLabel: string;
  displayName: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  answeredCount: number;
  rank: number | null;
  participantCount: number;
  teamName: string;
  teamRank: number | null;
  teamScore: number | null;
  message: string;
  series: {
    id: string;
    title: string;
    roundScore: number;
    roundRank: number | null;
    totalScore: number;
    seriesRank: number;
    nextRound: {
      title: string;
      scheduledAt: string | null;
      status: string;
    } | null;
  } | null;
  showCorrectAnswers: boolean;
  answers: Array<{
    id: string;
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    explanation: string | null;
    isCorrect: boolean | null;
    points: number;
  }>;
};

type ApiResponse =
  | {
      ok: true;
      data: PersonalResults;
    }
  | { ok: false; error: string };

function readParticipant(code: string): StoredParticipant | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(`maths4u_participant_${code}`);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredParticipant>;

    if (parsed.participantId && parsed.participantToken) {
      return {
        participantId: parsed.participantId,
        participantToken: parsed.participantToken,
        displayName: parsed.displayName ?? messages.play.player,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function PersonalResultsClient({ code }: { code: string }) {
  const [participant, setParticipant] = useState<StoredParticipant | null>(null);
  const [results, setResults] = useState<PersonalResults | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let stopped = false;

    async function loadResults(storedParticipant: StoredParticipant) {
      try {
        const response = await fetch(`/api/sessions/${code}/personal-results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            participantId: storedParticipant.participantId,
            participantToken: storedParticipant.participantToken,
          }),
        });
        const result = (await response.json()) as ApiResponse;

        if (stopped) {
          return;
        }

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setResults(result.data);
      } catch {
        setError(messages.api.unknownError);
      } finally {
        if (!stopped) {
          setPending(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      const storedParticipant = readParticipant(code);

      if (stopped) {
        return;
      }

      setParticipant(storedParticipant);

      if (!storedParticipant) {
        setPending(false);
        return;
      }

      loadResults(storedParticipant);
    }, 0);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [code]);

  if (pending) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-semibold">{messages.results.loadingPersonal}</p>
      </section>
    );
  }

  if (!participant) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold">{messages.game.joinRequiredTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{messages.game.joinRequiredDescription}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href={`/play?code=${code}`}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {messages.common.backToPlay}
          </Link>
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            {messages.common.home}
          </Link>
        </div>
      </section>
    );
  }

  if (error || !results) {
    return (
      <section className="rounded-md border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold">{messages.results.unavailable}</h1>
        <p className="mt-2 text-sm text-red-700">
          {error || messages.results.unavailableDescription}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href={`/game/${code}`}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {messages.game.backToGame}
          </Link>
          <Link
            href="/play"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            {messages.common.backToPlay}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <header className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
            {results.mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {messages.game.codeLabel}: {results.code}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-teal-800">{results.testTitle}</p>
        {results.sessionLabel ? <p className="mt-1 text-sm text-slate-500">{results.sessionLabel}</p> : null}
        <h1 className="mt-3 text-3xl font-black">{results.displayName}</h1>
        <p className="mt-2 text-lg font-semibold text-slate-700">{results.message}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/play"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {messages.game.playAnotherGame}
          </Link>
          {results.series ? (
            <Link
              href="/student"
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {messages.student.backToDashboard}
            </Link>
          ) : null}
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{messages.results.score}</p>
          <p className="mt-1 text-2xl font-bold">
            {results.score} / {results.maxScore}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{messages.results.percentage}</p>
          <p className="mt-1 text-2xl font-bold">{results.percentage}%</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{messages.results.correct}</p>
          <p className="mt-1 text-2xl font-bold">{results.correctCount}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{messages.results.rank}</p>
          <p className="mt-1 text-2xl font-bold">
            {results.rank ? `${results.rank} / ${results.participantCount}` : messages.results.hidden}
          </p>
        </div>
      </div>
      {results.teamName ? (
        <section className="rounded-md border border-teal-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">{messages.play.team}</p>
          <h2 className="mt-1 text-2xl font-bold">{results.teamName}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">{messages.results.teamRank}</p>
              <p className="mt-1 text-2xl font-bold">{results.teamRank ?? messages.results.hidden}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{messages.results.teamScore}</p>
              <p className="mt-1 text-2xl font-bold">{results.teamScore ?? messages.results.hidden}</p>
            </div>
          </div>
        </section>
      ) : null}
      {results.series ? (
        <section className="rounded-md border border-teal-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-800">{messages.student.seriesTitle}</p>
              <h2 className="text-xl font-bold">{results.series.title}</h2>
            </div>
            <Link
              href={`/student/series/${results.series.id}`}
              className="text-sm font-semibold text-teal-800 hover:text-teal-950"
            >
              {messages.common.open}
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div>
              <p className="text-sm text-slate-500">{messages.student.roundScore}</p>
              <p className="mt-1 text-2xl font-bold">{results.series.roundScore}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{messages.student.roundScore} {messages.results.rank}</p>
              <p className="mt-1 text-2xl font-bold">{results.series.roundRank ?? messages.results.hidden}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{messages.student.totalScore}</p>
              <p className="mt-1 text-2xl font-bold">{results.series.totalScore}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{messages.student.seriesRank}</p>
              <p className="mt-1 text-2xl font-bold">{results.series.seriesRank}</p>
            </div>
          </div>
          {results.series.nextRound ? (
            <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-medium text-teal-950">
              {messages.student.nextRoundInfo}: {results.series.nextRound.title}
              {results.series.nextRound.scheduledAt
                ? ` - ${new Date(results.series.nextRound.scheduledAt).toLocaleString()}`
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}
      {results.showCorrectAnswers ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">{messages.results.reviewTitle}</h2>
          {results.answers.map((answer, index) => (
            <article key={answer.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                {messages.game.questionLabel} {index + 1}
              </p>
              <h3 className="mt-2 font-semibold">{answer.question}</h3>
              <p className="mt-3 text-sm">
                <span className="font-semibold">{messages.results.yourAnswer}: </span>
                {answer.studentAnswer || messages.results.noAnswers}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">{messages.results.correctAnswer}: </span>
                {answer.correctAnswer || messages.results.hidden}
              </p>
              {answer.explanation ? <p className="mt-3 text-sm text-slate-600">{answer.explanation}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );
}
