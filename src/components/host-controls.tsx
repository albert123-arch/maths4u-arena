"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { messages } from "@/lib/messages";

import { CopyButton } from "./copy-button";
import { HostResultsPanel } from "./host-results-panel";
import { RunAgainButton } from "./run-again-button";
import { SessionArchiveButton } from "./session-archive-button";

type ParticipantLive = {
  id: string;
  displayName: string;
  teamId: string | null;
  teamName: string;
  joinedAt: string;
  answerCount: number;
  status: string;
};

type SessionTeam = {
  id: string;
  name: string;
};

type HostLiveSession = {
  code: string;
  status: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
  mode: string;
  testVersionId: string;
  testTitle: string;
  versionTitle: string;
  sessionLabel: string;
  participantCount: number;
  answerCount: number;
  submittedCount: number;
  registeredStudentCount: number;
  classTitle: string | null;
  missingStudents: Array<{
    id: string;
    displayName: string;
  }>;
  questionCount: number;
  serverTime: string;
  settings: {
    audience: "GUEST" | "CLASS" | "SERIES";
    label: string;
    allowLateJoin: boolean;
    showStudentResults: boolean;
    showCorrectAnswers: boolean;
    showLeaderboard: boolean;
    autoSubmitOnFinish: boolean;
    registeredOnly: boolean;
    classId: string | null;
    teamMode: boolean;
    teams: SessionTeam[];
  };
  participants: ParticipantLive[];
};

type ApiResponse =
  | {
      ok: true;
      data: HostLiveSession;
    }
  | { ok: false; error: string };

function statusBadge(status: HostLiveSession["status"]) {
  if (status === "RUNNING") {
    return "bg-emerald-100 text-emerald-900 border-emerald-200";
  }

  if (status === "FINISHED") {
    return "bg-slate-200 text-slate-900 border-slate-300";
  }

  return "bg-amber-100 text-amber-900 border-amber-200";
}

export function HostControls({
  initialLive,
  joinLink,
  settingsJson,
  resultsBasePath = "/admin/sessions",
  resultsApiPath,
  accessCheckPath = "/admin/sessions",
  runAgainApiPath = "/api/sessions",
  backHref = "/admin/sessions",
  archiveApiBase = "/api/admin/sessions",
}: {
  initialLive: HostLiveSession;
  joinLink: string;
  settingsJson: string;
  resultsBasePath?: string;
  resultsApiPath?: string;
  accessCheckPath?: string | null;
  runAgainApiPath?: string;
  backHref?: string;
  archiveApiBase?: string;
}) {
  const [live, setLive] = useState(initialLive);
  const [pendingAction, setPendingAction] = useState<"START" | "FINISH" | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | "started" | null>(null);
  const [qrLarge, setQrLarge] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const hostResultsApiPath = resultsApiPath ?? `/api/admin/sessions/${initialLive.code}/results`;

  async function fetchLive() {
    const response = await fetch(`/api/sessions/${live.code}/live`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as ApiResponse;

    if (result.ok) {
      setLive(result.data);
    }
  }

  useEffect(() => {
    let stopped = false;

    async function pollLiveStatus() {
      try {
        const response = await fetch(`/api/sessions/${initialLive.code}/live`, {
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
        // Keep the last host state when a silent poll fails.
      }
    }

    const interval = window.setInterval(pollLiveStatus, 2000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [initialLive.code]);

  function showStartCountdown() {
    setCountdown(3);
    window.setTimeout(() => setCountdown(2), 700);
    window.setTimeout(() => setCountdown(1), 1400);
    window.setTimeout(() => setCountdown("started"), 2100);
    window.setTimeout(() => setCountdown(null), 3200);
  }

  async function updateStatus(action: "START" | "FINISH") {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setError("");

    try {
      const response = await fetch(`/api/sessions/${live.code}/${action === "START" ? "start" : "finish"}`, {
        method: "POST",
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setLive(result.data);

      if (action === "START") {
        showStartCountdown();
      }
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPendingAction(null);
    }
  }

  const progress =
    live.participantCount === 0 ? 0 : Math.round((live.submittedCount / live.participantCount) * 100);
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
      <header className="grid gap-3 text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <span className={`rounded-md border px-3 py-1 text-sm font-bold ${statusBadge(live.status)}`}>
            {live.status === "LOBBY"
              ? messages.host.waitingStatus
              : live.status === "RUNNING"
                ? messages.host.liveStatus
                : messages.host.finishedStatus}
          </span>
          <span className="rounded-md border border-teal-700 bg-teal-500/15 px-3 py-1 text-sm font-bold text-teal-200">
            {live.mode === "HOST_PACED" ? messages.sessions.modeHostPaced : messages.sessions.modeClassic}
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

      {live.status === "LOBBY" ? (
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
                  {accessCheckPath ? (
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
              <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">{messages.host.participants}</p>
                <p className="mt-2 text-3xl font-bold">{live.participantCount}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">{messages.host.questions}</p>
                <p className="mt-2 text-3xl font-bold">{live.questionCount}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">{messages.host.status}</p>
                <p className="mt-2 text-xl font-bold">{messages.host.waitingStatus}</p>
              </div>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{messages.host.playersTitle}</h2>
                <button
                  type="button"
                  onClick={fetchLive}
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
                <TeamLobbyPanel participants={live.participants} teams={live.settings.teams} />
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {live.participants.map((participant) => (
                    <div key={participant.id} className="rounded-md border border-slate-700 bg-slate-950 p-3">
                      <p className="font-semibold">{participant.displayName}</p>
                      <p className="text-xs text-slate-400">{participant.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {qrLarge && live.status === "LOBBY" ? (
        <section className="grid place-items-center rounded-md border border-slate-700 bg-white p-8 text-slate-950">
          <QRCodeSVG value={joinLink} size={360} level="M" />
          <p className="mt-4 text-4xl font-black tracking-[0.18em]">{live.code}</p>
        </section>
      ) : null}

      {live.status === "RUNNING" ? (
        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{messages.host.participants}</p>
              <p className="mt-2 text-3xl font-bold">{live.participantCount}</p>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{messages.host.submitted}</p>
              <p className="mt-2 text-3xl font-bold">{live.submittedCount}</p>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{messages.host.answers}</p>
              <p className="mt-2 text-3xl font-bold">{live.answerCount}</p>
            </div>
            <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{messages.host.questions}</p>
              <p className="mt-2 text-3xl font-bold">{live.questionCount}</p>
            </div>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{messages.host.progress}</p>
              <p className="text-sm text-slate-400">
                {live.submittedCount} / {live.participantCount}
              </p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">{messages.host.playersTitle}</h2>
            <div className="mt-4 grid gap-2">
              {live.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="grid gap-2 rounded-md border border-slate-700 bg-slate-950 p-3 sm:grid-cols-[1fr_auto]"
                >
                  <span className="font-semibold">{participant.displayName}</span>
                  <span className="text-sm text-slate-300">
                    {participant.teamName ? `${participant.teamName} - ` : ""}
                    {participant.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {countdown !== null ? (
        <div className="rounded-md border border-teal-400 bg-teal-400/15 p-6 text-center text-teal-100">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            {countdown === "started" ? messages.host.gameStarted : messages.host.startingCountdown}
          </p>
          <p className="mt-2 text-6xl font-black">{countdown}</p>
        </div>
      ) : null}

      <section className="grid gap-3 rounded-md border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold">{messages.host.controlsTitle}</h2>
        <div className="flex flex-wrap gap-3">
          {live.status === "LOBBY" ? (
            <button
              type="button"
              onClick={() => updateStatus("START")}
              disabled={pendingAction !== null}
              className="rounded-md bg-teal-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-teal-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "START" ? messages.host.starting : messages.host.start}
            </button>
          ) : null}
          {live.status === "RUNNING" ? (
            <button
              type="button"
              onClick={() => updateStatus("FINISH")}
              disabled={pendingAction !== null}
              className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "FINISH" ? messages.host.finishing : messages.host.finish}
            </button>
          ) : null}
          <Link
            href={`${resultsBasePath}/${live.code}/results`}
            className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            {messages.sessions.resultsLink}
          </Link>
          <button
            type="button"
            onClick={() => setResultsVisible((current) => !current)}
            className="rounded-md border border-teal-500 px-4 py-2 font-semibold text-teal-100 transition hover:bg-teal-500/10 active:scale-[0.98]"
          >
            {resultsVisible ? messages.host.hideResultsOnScreen : messages.host.showResultsOnScreen}
          </button>
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
          {live.status === "FINISHED" ? (
            <RunAgainButton
              testVersionId={live.testVersionId}
              mode={live.mode}
              settingsJson={settingsJson}
              apiPath={runAgainApiPath}
            />
          ) : null}
          {live.status === "FINISHED" ? (
            <>
              <Link
                href={backHref}
                className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                {messages.teacher.backToLiveGames}
              </Link>
              <SessionArchiveButton code={live.code} action="archive" apiBase={archiveApiBase} />
            </>
          ) : null}
        </div>
        {live.status === "FINISHED" ? (
          <p className="rounded-md bg-slate-950 p-3 text-sm font-semibold text-teal-200">
            {messages.host.sessionFinished}
          </p>
        ) : null}
        {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}
      </section>
      {resultsVisible ? <HostResultsPanel apiPath={hostResultsApiPath} /> : null}
    </div>
  );
}

function TeamLobbyPanel({
  participants,
  teams,
}: {
  participants: ParticipantLive[];
  teams: SessionTeam[];
}) {
  const unassigned = participants.filter((participant) => !participant.teamId);

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {teams.map((team) => {
        const members = participants.filter((participant) => participant.teamId === team.id);

        return (
          <section key={team.id} className="rounded-md border border-slate-700 bg-slate-950 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">{team.name}</h3>
              <span className="rounded-md bg-teal-400/15 px-2 py-1 text-xs font-bold text-teal-100">
                {members.length}
              </span>
            </div>
            {members.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">{messages.host.noPlayers}</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {members.map((participant) => (
                  <div key={participant.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
                    <p className="font-semibold">{participant.displayName}</p>
                    <p className="text-xs text-slate-400">{participant.status}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {unassigned.length > 0 ? (
        <section className="rounded-md border border-dashed border-slate-700 bg-slate-950 p-3">
          <h3 className="font-bold">{messages.results.unassigned}</h3>
          <div className="mt-3 grid gap-2">
            {unassigned.map((participant) => (
              <div key={participant.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
                <p className="font-semibold">{participant.displayName}</p>
                <p className="text-xs text-slate-400">{participant.status}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
