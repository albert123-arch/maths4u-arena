"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import { messages } from "@/lib/messages";

import { CopyButton } from "./copy-button";
import { RunAgainButton } from "./run-again-button";

type HostPacedPhase =
  | "LOBBY"
  | "STARTING"
  | "QUESTION"
  | "QUESTION_LOCKED"
  | "REVEAL"
  | "LEADERBOARD"
  | "FINISHED";

type HostPacedQuestion = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  sortOrder: number;
  timeLimitSeconds: number | null;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect?: boolean;
  }>;
  correctAnswer?: string;
  explanation?: string | null;
};

type HostPacedLive = {
  code: string;
  mode: "HOST_PACED";
  status: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
  phase: HostPacedPhase;
  testVersionId: string;
  testTitle: string;
  versionTitle: string;
  sessionLabel: string;
  currentQuestionIndex: number;
  questionCount: number;
  currentQuestion: HostPacedQuestion | null;
  remainingSeconds: number | null;
  participantCount: number;
  registeredStudentCount: number;
  classTitle: string | null;
  missingStudents: Array<{
    id: string;
    displayName: string;
  }>;
  answeredCurrentQuestionCount: number;
  answerDistribution: Array<{
    id: string;
    label: string;
    count: number;
    isCorrect?: boolean;
  }>;
  leaderboardTop: Array<{
    id: string;
    rank: number;
    displayName: string;
    teamId: string | null;
    teamName: string;
    score: number;
    correctCount: number;
  }>;
  teamLeaderboardTop: Array<{
    id: string;
    rank: number;
    name: string;
    score: number;
    memberCount: number;
    correctCount: number;
    answeredCount: number;
    averagePercentage: number;
  }>;
  serverTime: string;
  settings: {
    audience: "GUEST" | "CLASS" | "SERIES";
    questionTimeLimitSeconds: number;
    registeredOnly: boolean;
    classId: string | null;
    teamMode: boolean;
    teams: Array<{
      id: string;
      name: string;
    }>;
  };
  participants: Array<{
    id: string;
    displayName: string;
    teamId: string | null;
    teamName: string;
    joinedAt: string;
    answeredCurrentQuestion: boolean;
    answerCount: number;
  }>;
};

type ApiResponse =
  | {
      ok: true;
      data: HostPacedLive;
    }
  | { ok: false; error: string };

function phaseLabel(phase: HostPacedPhase) {
  return phase.replaceAll("_", " ");
}

function phaseBadgeClass(phase: HostPacedPhase) {
  if (phase === "QUESTION") {
    return "border-emerald-300 bg-emerald-400/15 text-emerald-100";
  }

  if (phase === "FINISHED") {
    return "border-slate-500 bg-slate-500/20 text-slate-100";
  }

  if (phase === "REVEAL" || phase === "LEADERBOARD") {
    return "border-teal-300 bg-teal-400/15 text-teal-100";
  }

  return "border-amber-300 bg-amber-400/15 text-amber-100";
}

export function HostPacedHostControls({
  initialLive,
  joinLink,
  settingsJson,
  resultsBasePath = "/admin/sessions",
  accessCheckPath = "/admin/sessions",
  runAgainApiPath = "/api/sessions",
  presenterMode = false,
}: {
  initialLive: HostPacedLive;
  joinLink: string;
  settingsJson: string;
  resultsBasePath?: string;
  accessCheckPath?: string | null;
  runAgainApiPath?: string;
  presenterMode?: boolean;
}) {
  const [live, setLive] = useState(initialLive);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [qrLarge, setQrLarge] = useState(false);
  const [startingCountdown, setStartingCountdown] = useState<number | "open" | null>(null);
  const autoOpenStarted = useRef(false);

  async function fetchLive() {
    try {
      const response = await fetch(`/api/sessions/${live.code}/host-paced/live`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as ApiResponse;

      if (result.ok) {
        setLive(result.data);
      }
    } catch {
      // Keep the last host state when polling fails.
    }
  }

  async function runAction(action: string, body?: Record<string, unknown>) {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setError("");

    try {
      const response = await fetch(`/api/sessions/${live.code}/host-paced/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setLive(result.data);
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPendingAction("");
    }
  }

  useEffect(() => {
    let stopped = false;
    const code = initialLive.code;

    async function poll() {
      if (stopped) {
        return;
      }

      try {
        const response = await fetch(`/api/sessions/${code}/host-paced/live`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as ApiResponse;

        if (!stopped && result.ok) {
          setLive(result.data);
        }
      } catch {
        // Keep the last host state when polling fails.
      }
    }

    const interval = window.setInterval(poll, 2000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [initialLive.code]);

  useEffect(() => {
    if (presenterMode) {
      return;
    }

    if (live.phase !== "STARTING") {
      autoOpenStarted.current = false;
      return;
    }

    if (autoOpenStarted.current) {
      return;
    }

    autoOpenStarted.current = true;
    const timers = [
      window.setTimeout(() => setStartingCountdown(3), 0),
      window.setTimeout(() => setStartingCountdown(2), 800),
      window.setTimeout(() => setStartingCountdown(1), 1600),
      window.setTimeout(() => setStartingCountdown("open"), 2400),
      window.setTimeout(async () => {
        setPendingAction("open-question");
        setError("");

        try {
          const response = await fetch(`/api/sessions/${live.code}/host-paced/open-question`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              currentQuestionIndex: live.currentQuestionIndex,
            }),
          });
          const result = (await response.json()) as ApiResponse;

          if (!result.ok) {
            setError(result.error);
            return;
          }

          setLive(result.data);
        } catch {
          setError(messages.api.unknownError);
        } finally {
          setPendingAction("");
        }
      }, 3000),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [live.code, live.currentQuestionIndex, live.phase, presenterMode]);

  const currentQuestion = live.currentQuestion;
  const timeLimit = currentQuestion?.timeLimitSeconds ?? live.settings.questionTimeLimitSeconds;
  const timerPercent =
    live.remainingSeconds === null || timeLimit <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((live.remainingSeconds / timeLimit) * 100)));
  const distributionMax = Math.max(1, ...live.answerDistribution.map((item) => item.count));
  const isLastQuestion = live.currentQuestionIndex >= live.questionCount - 1;
  const isClassGame = live.settings.audience === "CLASS" || Boolean(live.settings.classId);
  const studentInstructions = isClassGame
    ? `Join the Maths4U Arena class game:
1. Open: ${joinLink}
2. Log in with your student username and PIN.
3. You will join automatically as your class account.`
    : `Join the Maths4U Arena round:
1. Open: ${joinLink}
2. Log in with your username and PIN.
3. Wait for the host to start.`;

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Link
          href={presenterMode ? `/host/${live.code}` : `/host/${live.code}/present`}
          className="rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 active:scale-[0.98]"
        >
          {presenterMode
            ? messages.host.hostPaced.exitPresenterMode
            : messages.host.hostPaced.presenterMode}
        </Link>
      </div>

      <header className="grid gap-3 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <span className={`rounded-md border px-3 py-1 text-sm font-bold ${phaseBadgeClass(live.phase)}`}>
            {phaseLabel(live.phase)}
          </span>
          <span className="rounded-md border border-teal-700 bg-teal-500/15 px-3 py-1 text-sm font-bold text-teal-200">
            {messages.host.hostPaced.modeBadge}
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-500/15 px-3 py-1 text-sm font-bold text-slate-200">
            {live.settings.teamMode ? messages.sessions.teamBadge : messages.sessions.individualBadge}
          </span>
          {isClassGame ? (
            <span className="rounded-md border border-teal-700 bg-teal-500/15 px-3 py-1 text-sm font-bold text-teal-200">
              {messages.play.classGameBadge}
            </span>
          ) : null}
        </div>
        <h1 className="text-5xl font-black tracking-[0.18em] sm:text-7xl">{live.code}</h1>
        <p className="text-xl text-slate-300">{live.testTitle}</p>
        {live.sessionLabel ? <p className="text-sm font-semibold text-teal-200">{live.sessionLabel}</p> : null}
      </header>

      {live.phase === "LOBBY" ? (
        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="grid gap-3 rounded-md border border-slate-700 bg-white p-4 text-slate-950 shadow-lg">
            <div className="mx-auto rounded-md bg-white p-3">
              <QRCodeSVG value={joinLink} size={240} level="M" />
            </div>
            <p className="break-all text-center text-sm text-slate-600">{joinLink}</p>
            <div className="grid grid-cols-2 gap-2">
              <CopyButton value={joinLink} label={messages.host.copyJoinLink} />
              <CopyButton value={live.code} label={messages.host.copyGameCode} />
            </div>
            {live.settings.registeredOnly ? (
              <CopyButton value={studentInstructions} label={messages.host.copyStudentInstructions} />
            ) : null}
            <button
              type="button"
              onClick={() => setQrLarge((current) => !current)}
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              {qrLarge ? messages.host.hideFullscreenQr : messages.host.fullscreenQr}
            </button>
          </div>
          <div className="grid gap-4">
            {live.settings.registeredOnly ? (
              <div className="rounded-md border border-teal-500/40 bg-teal-500/10 p-4 text-teal-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold">
                      {isClassGame && live.classTitle
                        ? `${messages.host.classGame}: ${live.classTitle}`
                        : messages.host.registeredRound}
                    </h2>
                    <p className="mt-1 text-sm text-teal-100">
                      {isClassGame ? messages.host.classGameHelp : messages.host.registeredRoundHelp}
                    </p>
                  </div>
                  {!presenterMode && accessCheckPath ? (
                    <Link
                      href={`${accessCheckPath}/${live.code}/access-check`}
                      className="rounded-md border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-50 transition hover:bg-teal-400/10"
                    >
                      {messages.host.accessCheck}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-slate-950/40 p-3">
                    <p className="text-xs text-teal-100">{messages.host.registeredStudentsCount}</p>
                    <p className="mt-1 text-2xl font-bold">{live.registeredStudentCount}</p>
                  </div>
                  <div className="rounded-md bg-slate-950/40 p-3">
                    <p className="text-xs text-teal-100">{messages.host.joinedParticipantsCount}</p>
                    <p className="mt-1 text-2xl font-bold">{live.participantCount}</p>
                  </div>
                </div>
                {isClassGame && live.missingStudents.length > 0 ? (
                  <div className="mt-4 rounded-md bg-slate-950/40 p-3">
                    <p className="text-xs font-semibold text-teal-100">{messages.host.notJoinedYet}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {live.missingStudents.slice(0, 12).map((student) => (
                        <span
                          key={student.id}
                          className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-100"
                        >
                          {student.displayName}
                        </span>
                      ))}
                      {live.missingStudents.length > 12 ? (
                        <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-100">
                          +{live.missingStudents.length - 12}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard label={messages.host.participants} value={live.participantCount} />
              <MetricCard label={messages.host.questions} value={live.questionCount} />
              <MetricCard label={messages.host.status} value={messages.host.waitingStatus} />
            </div>
            <ParticipantsPanel live={live} onRefresh={fetchLive} presenterMode={presenterMode} />
          </div>
        </section>
      ) : null}

      {qrLarge && live.phase === "LOBBY" ? (
        <section className="grid place-items-center rounded-md border border-slate-700 bg-white p-8 text-slate-950">
          <QRCodeSVG value={joinLink} size={360} level="M" />
          <p className="mt-4 text-4xl font-black tracking-[0.18em]">{live.code}</p>
        </section>
      ) : null}

      {live.phase === "STARTING" ? (
        <section className="rounded-md border border-teal-400 bg-teal-400/15 p-8 text-center text-teal-100">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            {messages.host.hostPaced.getReady}
          </p>
          <p className="mt-4 text-7xl font-black">
            {startingCountdown === "open" ? messages.host.gameStarted : startingCountdown ?? 3}
          </p>
        </section>
      ) : null}

      {live.phase === "QUESTION" ? (
        <section className="grid gap-4 rounded-md border border-slate-700 bg-slate-900 p-5">
          <QuestionHeader live={live} />
          <TimerBar remaining={live.remainingSeconds} percent={timerPercent} />
          <CurrentQuestionCard question={currentQuestion} />
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label={messages.host.hostPaced.answered} value={`${live.answeredCurrentQuestionCount} / ${live.participantCount}`} />
            <MetricCard label={messages.host.hostPaced.timer} value={live.remainingSeconds ?? "-"} />
            <MetricCard label={messages.host.participants} value={live.participantCount} />
          </div>
          <DistributionPanel distribution={live.answerDistribution} max={distributionMax} />
        </section>
      ) : null}

      {live.phase === "QUESTION_LOCKED" ? (
        <section className="grid gap-4 rounded-md border border-amber-300 bg-amber-400/10 p-6 text-amber-50">
          <h2 className="text-3xl font-black">{messages.host.hostPaced.answersLocked}</h2>
          <p className="text-lg">
            {live.answeredCurrentQuestionCount} / {live.participantCount} {messages.host.submitted.toLowerCase()}
          </p>
        </section>
      ) : null}

      {live.phase === "REVEAL" ? (
        <section className="grid gap-4 rounded-md border border-slate-700 bg-slate-900 p-5">
          <QuestionHeader live={live} />
          <CurrentQuestionCard question={currentQuestion} reveal />
          <DistributionPanel distribution={live.answerDistribution} max={distributionMax} />
        </section>
      ) : null}

      {live.phase === "LEADERBOARD" || live.phase === "FINISHED" ? (
        <section className="grid gap-4 rounded-md border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-2xl font-black">
            {live.phase === "FINISHED" ? messages.host.hostPaced.finalLeaderboard : messages.results.leaderboard}
          </h2>
          {live.settings.teamMode ? <TeamLeaderboardPanel rows={live.teamLeaderboardTop} /> : null}
          <LeaderboardPanel rows={live.leaderboardTop} />
        </section>
      ) : null}

      {presenterMode ? null : (
      <section className="grid gap-3 rounded-md border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold">{messages.host.controlsTitle}</h2>
        <div className="flex flex-wrap gap-3">
          {live.phase === "LOBBY" ? (
            <ActionButton
              label={messages.host.start}
              loadingLabel={messages.host.starting}
              pending={pendingAction === "start"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("start")}
              primary
            />
          ) : null}
          {live.phase === "STARTING" ? (
            <ActionButton
              label={messages.host.hostPaced.openQuestion}
              loadingLabel={messages.host.hostPaced.openingQuestion}
              pending={pendingAction === "open-question"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("open-question", { currentQuestionIndex: live.currentQuestionIndex })}
              primary
            />
          ) : null}
          {live.phase === "QUESTION" ? (
            <ActionButton
              label={messages.host.hostPaced.lockQuestion}
              loadingLabel={messages.host.hostPaced.lockingQuestion}
              pending={pendingAction === "lock-question"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("lock-question")}
              primary
            />
          ) : null}
          {live.phase === "QUESTION_LOCKED" ? (
            <ActionButton
              label={messages.host.hostPaced.reveal}
              loadingLabel={messages.host.hostPaced.revealing}
              pending={pendingAction === "reveal"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("reveal")}
              primary
            />
          ) : null}
          {live.phase === "REVEAL" ? (
            <ActionButton
              label={messages.host.hostPaced.showLeaderboard}
              loadingLabel={messages.host.hostPaced.showingLeaderboard}
              pending={pendingAction === "show-leaderboard"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("show-leaderboard")}
              primary
            />
          ) : null}
          {live.phase === "LEADERBOARD" && !isLastQuestion ? (
            <ActionButton
              label={messages.host.hostPaced.nextQuestion}
              loadingLabel={messages.host.hostPaced.openingQuestion}
              pending={pendingAction === "next-question"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("next-question")}
              primary
            />
          ) : null}
          {(live.phase === "LEADERBOARD" && isLastQuestion) || live.phase === "QUESTION_LOCKED" || live.phase === "REVEAL" ? (
            <ActionButton
              label={messages.host.finish}
              loadingLabel={messages.host.finishing}
              pending={pendingAction === "finish"}
              disabled={Boolean(pendingAction)}
              onClick={() => runAction("finish")}
            />
          ) : null}
          <Link
            href={`${resultsBasePath}/${live.code}/results`}
            className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            {messages.sessions.resultsLink}
          </Link>
          {accessCheckPath ? (
            <Link
              href={`${accessCheckPath}/${live.code}/access-check`}
              className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              {messages.host.accessCheck}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={fetchLive}
            className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            {messages.host.refreshNow}
          </button>
          {live.phase === "FINISHED" ? (
            <RunAgainButton
              testVersionId={live.testVersionId}
              mode={live.mode}
              settingsJson={settingsJson}
              apiPath={runAgainApiPath}
            />
          ) : null}
        </div>
        {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}
      </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function ParticipantsPanel({
  live,
  onRefresh,
  presenterMode,
}: {
  live: HostPacedLive;
  onRefresh: () => void;
  presenterMode: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{messages.host.playersTitle}</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-slate-600 px-3 py-2 text-sm font-semibold transition hover:bg-slate-800 active:scale-[0.98]"
        >
          {messages.host.refreshNow}
        </button>
      </div>
      {live.participants.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-400">
          {messages.host.noPlayers}
        </p>
      ) : live.settings.teamMode ? (
        <TeamLobbyPanel live={live} presenterMode={presenterMode} />
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {live.participants.map((participant) => (
            <div key={participant.id} className="rounded-md border border-slate-700 bg-slate-950 p-3">
              <p className="font-semibold">{participant.displayName}</p>
              {participant.teamName ? (
                <p className="text-xs font-semibold text-teal-200">{participant.teamName}</p>
              ) : null}
              <p className="text-xs text-slate-400">
                {participant.answeredCurrentQuestion ? messages.game.submitted : messages.game.joinedTitle}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamLobbyPanel({
  live,
  presenterMode,
}: {
  live: HostPacedLive;
  presenterMode: boolean;
}) {
  const unassigned = live.participants.filter((participant) => !participant.teamId);

  return (
    <div className={`mt-4 grid gap-3 ${presenterMode ? "lg:grid-cols-2" : "md:grid-cols-2"}`}>
      {live.settings.teams.map((team) => {
        const members = live.participants.filter((participant) => participant.teamId === team.id);

        return (
          <section key={team.id} className="rounded-md border border-slate-700 bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className={presenterMode ? "text-2xl font-black" : "font-bold"}>{team.name}</h3>
              <span className="rounded-md bg-teal-400/15 px-2 py-1 text-sm font-bold text-teal-100">
                {members.length}
              </span>
            </div>
            {members.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{messages.host.noPlayers}</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {members.map((participant) => (
                  <div key={participant.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                    <p className={presenterMode ? "text-xl font-bold" : "font-semibold"}>{participant.displayName}</p>
                    <p className="text-xs text-slate-400">
                      {participant.answeredCurrentQuestion ? messages.game.submitted : messages.game.joinedTitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {unassigned.length > 0 ? (
        <section className="rounded-md border border-dashed border-slate-700 bg-slate-950 p-4">
          <h3 className="font-bold">{messages.results.unassigned}</h3>
          <div className="mt-3 grid gap-2">
            {unassigned.map((participant) => (
              <div key={participant.id} className="rounded-md border border-slate-800 bg-slate-900 p-3">
                <p className="font-semibold">{participant.displayName}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuestionHeader({ live }: { live: HostPacedLive }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">
          {messages.host.hostPaced.question} {live.currentQuestionIndex + 1} / {live.questionCount}
        </p>
        <h2 className="mt-1 text-2xl font-black">{live.testTitle}</h2>
      </div>
      <span className={`w-fit rounded-md border px-3 py-1 text-sm font-bold ${phaseBadgeClass(live.phase)}`}>
        {phaseLabel(live.phase)}
      </span>
    </div>
  );
}

function TimerBar({ remaining, percent }: { remaining: number | null; percent: number }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{messages.host.hostPaced.timer}</p>
        <p className="text-2xl font-black text-teal-200">{remaining ?? "-"}</p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function CurrentQuestionCard({
  question,
  reveal = false,
}: {
  question: HostPacedQuestion | null;
  reveal?: boolean;
}) {
  if (!question) {
    return (
      <p className="rounded-md border border-slate-700 bg-slate-950 p-5 text-slate-300">
        {messages.host.hostPaced.noCurrentQuestion}
      </p>
    );
  }

  return (
    <article className="rounded-md border border-slate-700 bg-slate-950 p-5">
      <p className="text-sm font-semibold text-slate-400">
        {question.points} {question.points === 1 ? messages.game.point : messages.game.points}
      </p>
      <h3 className="mt-2 text-2xl font-bold">{question.prompt}</h3>
      {question.options.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={`rounded-md border p-3 text-sm font-semibold ${
                reveal && option.isCorrect
                  ? "border-emerald-400 bg-emerald-400/15 text-emerald-100"
                  : "border-slate-700 bg-slate-900 text-slate-100"
              }`}
            >
              {option.optionText}
            </div>
          ))}
        </div>
      ) : null}
      {reveal && question.correctAnswer ? (
        <p className="mt-4 rounded-md bg-teal-400/10 p-3 text-sm font-semibold text-teal-100">
          {messages.host.hostPaced.correctAnswer}: {question.correctAnswer}
        </p>
      ) : null}
      {reveal && question.explanation ? (
        <p className="mt-3 text-sm leading-6 text-slate-300">{question.explanation}</p>
      ) : null}
    </article>
  );
}

function DistributionPanel({
  distribution,
  max,
}: {
  distribution: HostPacedLive["answerDistribution"];
  max: number;
}) {
  return (
    <section className="rounded-md border border-slate-700 bg-slate-950 p-5">
      <h3 className="text-lg font-bold">{messages.host.hostPaced.answerDistribution}</h3>
      {distribution.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{messages.host.hostPaced.noDistribution}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {distribution.map((item) => (
            <div key={item.id} className="grid gap-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className={item.isCorrect ? "font-semibold text-emerald-200" : "font-semibold"}>
                  {item.label}
                </span>
                <span>{item.count}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.isCorrect ? "bg-emerald-400" : "bg-teal-400"
                  }`}
                  style={{ width: `${Math.round((item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LeaderboardPanel({ rows }: { rows: HostPacedLive["leaderboardTop"] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">{messages.results.empty}</p>;
  }

  return (
    <section className="grid gap-2">
      <h3 className="text-lg font-bold">{messages.results.individualLeaderboard}</h3>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-slate-700 bg-slate-950 p-3"
        >
          <span className="text-xl font-black text-teal-200">#{row.rank}</span>
          <div>
            <p className="font-semibold">{row.displayName}</p>
            <p className="text-xs text-slate-400">
              {row.teamName ? `${row.teamName} - ` : ""}
              {row.correctCount} {messages.results.correct.toLowerCase()}
            </p>
          </div>
          <span className="text-lg font-black">{row.score}</span>
        </div>
      ))}
    </section>
  );
}

function TeamLeaderboardPanel({ rows }: { rows: HostPacedLive["teamLeaderboardTop"] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2 rounded-md border border-teal-800 bg-slate-950 p-4">
      <h3 className="text-lg font-bold text-teal-100">{messages.results.teamLeaderboard}</h3>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-slate-700 bg-slate-900 p-3"
        >
          <span className="text-xl font-black text-teal-200">#{row.rank}</span>
          <div>
            <p className="font-semibold">{row.name}</p>
            <p className="text-xs text-slate-400">
              {row.memberCount} {messages.results.members.toLowerCase()} - {row.correctCount}{" "}
              {messages.results.correct.toLowerCase()}
            </p>
          </div>
          <span className="text-lg font-black">{row.score}</span>
        </div>
      ))}
    </section>
  );
}

function ActionButton({
  label,
  loadingLabel,
  pending,
  disabled,
  primary = false,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  pending: boolean;
  disabled: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "rounded-md bg-teal-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-teal-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
