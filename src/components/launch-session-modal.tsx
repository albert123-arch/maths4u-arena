"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  DEFAULT_SESSION_SETTINGS,
  DEFAULT_SESSION_TEAMS,
  sessionSettingsJson,
  type SessionTeam,
  type TeamScoringMode,
} from "@/lib/session-settings";
import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: {
        code: string;
      };
    }
  | { ok: false; error: string };

const modeCards = [
  { mode: "CLASSIC", label: messages.sessions.modeClassic, available: true },
  { mode: "HOST_PACED", label: messages.sessions.modeHostPaced, available: true },
  { mode: "ACCURACY", label: "Accuracy", available: false },
  { mode: "TEAM", label: "Team", available: false },
  { mode: "PRACTICE", label: "Practice", available: false },
  { mode: "CAROUSEL", label: "Carousel", available: false },
] as const;

export function LaunchSessionModal({
  testTitle,
  versionTitle,
  testVersionId,
  questionCount,
  apiPath = "/api/sessions",
  classrooms = [],
  defaultClassId = "",
}: {
  testTitle: string;
  versionTitle: string;
  testVersionId: string;
  questionCount: number;
  apiPath?: string;
  classrooms?: Array<{
    id: string;
    title: string;
  }>;
  defaultClassId?: string;
}) {
  const router = useRouter();
  const initialClassId =
    classrooms.find((classroom) => classroom.id === defaultClassId)?.id ?? classrooms[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"CLASSIC" | "HOST_PACED">("CLASSIC");
  const [allowLateJoin, setAllowLateJoin] = useState(true);
  const [showStudentResults, setShowStudentResults] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [autoSubmitOnFinish, setAutoSubmitOnFinish] = useState(true);
  const [questionTimeLimitSeconds, setQuestionTimeLimitSeconds] = useState(30);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [teamMode, setTeamMode] = useState(false);
  const [teams, setTeams] = useState<SessionTeam[]>(DEFAULT_SESSION_TEAMS);
  const [teamScoring, setTeamScoring] = useState<TeamScoringMode>("sum");
  const [accessMode, setAccessMode] = useState<"GUEST" | "CLASS_ONLY">(
    initialClassId ? "CLASS_ONLY" : "GUEST",
  );
  const [classId, setClassId] = useState(initialClassId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  async function launch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const selectedClassId = accessMode === "CLASS_ONLY" ? classId : null;
      const audience = selectedClassId ? "CLASS" : "GUEST";
      const response = await fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testVersionId,
          mode,
          settingsJson: sessionSettingsJson({
            ...DEFAULT_SESSION_SETTINGS,
            label,
            allowLateJoin,
            showStudentResults,
            showCorrectAnswers,
            showLeaderboard,
            autoSubmitOnFinish: mode === "HOST_PACED" ? false : autoSubmitOnFinish,
            audience,
            teamMode,
            teamAssignMode: "manual",
            teams,
            teamScoring,
            registeredOnly: audience === "CLASS",
            classId: selectedClassId,
            ...(mode === "HOST_PACED"
              ? {
                  questionTimeLimitSeconds,
                  speedBonus,
                  showQuestionOnStudent: true,
                  showQuestionOnHost: true,
                  autoAdvance: false,
                  phase: "LOBBY",
                  currentQuestionIndex: 0,
                  questionStartedAt: null,
                  questionEndsAt: null,
                  lastPhaseChangedAt: null,
                }
              : {}),
          }),
          showResults: true,
          classId: selectedClassId,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCode(result.data.code);
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  function close() {
    setOpen(false);
    setError("");
    setCode("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98]"
      >
        {messages.sessions.launch}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 text-slate-950 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{messages.sessions.launchTitle}</h2>
                <p className="mt-1 text-sm text-slate-600">{testTitle}</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                {messages.common.close}
              </button>
            </div>

            {code ? (
              <div className="mt-6 grid gap-4 rounded-md border border-teal-200 bg-teal-50 p-4">
                <p className="text-sm font-semibold text-teal-900">{messages.sessions.launched}</p>
                <p className="text-4xl font-black tracking-[0.2em] text-teal-950">{code}</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/host/${code}`}
                    className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
                  >
                    {messages.sessions.openHost}
                  </Link>
                  <Link
                    href={`/play?code=${code}`}
                    className="rounded-md border border-slate-300 px-4 py-2 font-semibold transition hover:bg-white"
                  >
                    {messages.sessions.studentJoinLink}
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.push(`/host/${code}`)}
                    className="rounded-md border border-slate-300 px-4 py-2 font-semibold transition hover:bg-white"
                  >
                    {messages.sessions.goToHost}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={launch} className="mt-6 grid gap-5">
                <div className="grid gap-3 rounded-md border border-slate-200 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {messages.tests.fields.title}
                    </p>
                    <p className="mt-1 font-semibold">{testTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {messages.tests.versionPrefix}
                    </p>
                    <p className="mt-1 font-semibold">{versionTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {messages.tests.questionCount}
                    </p>
                    <p className="mt-1 font-semibold">{questionCount}</p>
                  </div>
                </div>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  {messages.sessions.sessionLabel}
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    placeholder={messages.sessions.sessionLabelPlaceholder}
                  />
                </label>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    {messages.sessions.chooseMode}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {modeCards.map((card) => (
                      <button
                        key={card.mode}
                        type="button"
                        disabled={!card.available}
                        onClick={() => {
                          if (card.mode === "CLASSIC" || card.mode === "HOST_PACED") {
                            setMode(card.mode);
                          }
                        }}
                        className={`rounded-md border p-4 text-left transition ${
                          card.available && card.mode === mode
                            ? "border-teal-500 bg-teal-50 shadow-sm ring-2 ring-teal-100"
                            : card.available
                              ? "border-slate-300 bg-white hover:border-teal-300"
                            : "border-slate-200 bg-slate-50 opacity-70"
                        }`}
                      >
                        <span className="font-semibold">{card.label}</span>
                        <span className="mt-2 block text-xs font-semibold text-slate-500">
                          {card.available ? messages.sessions.available : messages.sessions.comingSoon}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <section className="grid gap-3 rounded-md border border-slate-200 p-4">
                  <h3 className="font-semibold">{messages.sessions.settingsTitle}</h3>
                  {classrooms.length > 0 ? (
                    <div className="grid gap-3 border-b border-slate-200 pb-3">
                      <p className="text-sm font-semibold text-slate-700">{messages.teacher.launchForClass}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setAccessMode("GUEST")}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                            accessMode === "GUEST"
                              ? "border-teal-500 bg-teal-50 text-teal-900"
                              : "border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block">{messages.teacher.guestLink}</span>
                          <span className="mt-1 block text-xs font-medium text-slate-500">
                            {messages.teacher.guestLinkHelp}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAccessMode("CLASS_ONLY");
                            if (!classId && initialClassId) {
                              setClassId(initialClassId);
                            }
                          }}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                            accessMode === "CLASS_ONLY"
                              ? "border-teal-500 bg-teal-50 text-teal-900"
                              : "border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block">{messages.teacher.classOnlyLink}</span>
                          <span className="mt-1 block text-xs font-medium text-slate-500">
                            {messages.teacher.classOnlyLinkHelp}
                          </span>
                        </button>
                      </div>
                      {accessMode === "CLASS_ONLY" ? (
                        <label className="grid gap-1 text-sm font-medium text-slate-700">
                          {messages.teacher.myClasses}
                          <select
                            value={classId}
                            onChange={(event) => setClassId(event.target.value)}
                            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                            required
                          >
                            {classrooms.map((classroom) => (
                              <option key={classroom.id} value={classroom.id}>
                                {classroom.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                  {mode === "HOST_PACED" ? (
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      {messages.sessions.questionTimeLimitSeconds}
                      <input
                        type="number"
                        min={5}
                        max={600}
                        value={questionTimeLimitSeconds}
                        onChange={(event) => setQuestionTimeLimitSeconds(Number(event.target.value))}
                        className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                      />
                    </label>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SettingToggle
                      label={messages.sessions.allowLateJoin}
                      checked={allowLateJoin}
                      onChange={setAllowLateJoin}
                    />
                    <SettingToggle
                      label={messages.sessions.showStudentResults}
                      checked={showStudentResults}
                      onChange={setShowStudentResults}
                    />
                    <SettingToggle
                      label={messages.sessions.showLeaderboard}
                      checked={showLeaderboard}
                      onChange={setShowLeaderboard}
                    />
                    <SettingToggle
                      label={messages.sessions.showCorrectAnswers}
                      checked={showCorrectAnswers}
                      onChange={setShowCorrectAnswers}
                    />
                    {mode === "HOST_PACED" ? (
                      <SettingToggle
                        label={messages.sessions.speedBonus}
                        checked={speedBonus}
                        onChange={setSpeedBonus}
                      />
                    ) : (
                      <SettingToggle
                        label={messages.sessions.autoSubmitOnFinish}
                        checked={autoSubmitOnFinish}
                        onChange={setAutoSubmitOnFinish}
                      />
                    )}
                  </div>
                  <div className="grid gap-3 border-t border-slate-200 pt-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {messages.sessions.teamSettings}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setTeamMode(false)}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                          !teamMode
                            ? "border-teal-500 bg-teal-50 text-teal-900"
                            : "border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {messages.sessions.individualMode}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamMode(true)}
                        className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                          teamMode
                            ? "border-teal-500 bg-teal-50 text-teal-900"
                            : "border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {messages.sessions.teamMode}
                      </button>
                    </div>
                    {teamMode ? (
                      <div className="grid gap-3 rounded-md border border-teal-100 bg-teal-50/50 p-3">
                        <label className="grid gap-1 text-sm font-medium text-slate-700">
                          {messages.sessions.teamScoring}
                          <select
                            value={teamScoring}
                            onChange={(event) => setTeamScoring(event.target.value as TeamScoringMode)}
                            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                          >
                            <option value="sum">{messages.sessions.teamScoringSum}</option>
                            <option value="average">{messages.sessions.teamScoringAverage}</option>
                            <option value="top3">{messages.sessions.teamScoringTop3}</option>
                          </select>
                        </label>
                        <div className="grid gap-2">
                          {teams.map((team) => (
                            <div key={team.id} className="flex gap-2">
                              <label className="grid flex-1 gap-1 text-sm font-medium text-slate-700">
                                {messages.sessions.teamName}
                                <input
                                  value={team.name}
                                  onChange={(event) =>
                                    setTeams((current) =>
                                      current.map((item) =>
                                        item.id === team.id ? { ...item, name: event.target.value } : item,
                                      ),
                                    )
                                  }
                                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  setTeams((current) => current.filter((item) => item.id !== team.id))
                                }
                                disabled={teams.length <= 1}
                                className="mt-6 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50"
                              >
                                {messages.sessions.removeTeam}
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTeams((current) => [
                              ...current,
                              {
                                id: `team_${Date.now().toString(36)}`,
                                name: `Team ${current.length + 1}`,
                              },
                            ])
                          }
                          className="w-fit rounded-md border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-white"
                        >
                          {messages.sessions.addTeam}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:opacity-60"
                >
                  {pending
                    ? messages.sessions.launching
                    : `${messages.sessions.launch} ${
                        mode === "HOST_PACED"
                          ? messages.sessions.modeHostPaced
                          : messages.sessions.modeClassic
                      }`}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-teal-700"
      />
    </label>
  );
}
