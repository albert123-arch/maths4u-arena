"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { SERIES_ROUND_STATUSES } from "@/lib/constants";
import { messages } from "@/lib/messages";

type StudentOption = {
  id: string;
  displayName: string;
  username: string;
  groupName: string | null;
};

type VersionOption = {
  id: string;
  title: string;
  versionNumber: number;
  test: {
    title: string;
  };
};

type RegistrationRow = {
  id: string;
  studentId: string;
  displayNameSnapshot: string;
  status: string;
  student: StudentOption;
};

type RoundRow = {
  id: string;
  title: string;
  roundNumber: number;
  scheduledAt: string | null;
  status: string;
  sessionId: string | null;
  session: {
    code: string;
    status: string;
  } | null;
  testVersion: VersionOption;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        code?: string;
      };
    }
  | { ok: false; error: string };

export function AdminSeriesDetail({
  seriesId,
  registrations,
  rounds,
  students,
  versions,
}: {
  seriesId: string;
  registrations: RegistrationRow[];
  rounds: RoundRow[];
  students: StudentOption[];
  versions: VersionOption[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [testVersionId, setTestVersionId] = useState(versions[0]?.id ?? "");
  const [roundTitle, setRoundTitle] = useState("");
  const [roundNumber, setRoundNumber] = useState(
    String(rounds.length > 0 ? Math.max(...rounds.map((round) => round.roundNumber)) + 1 : 1),
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [roundStatus, setRoundStatus] = useState("DRAFT");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  async function handleResponse(response: Response, successMessage: string) {
    const result = (await response.json()) as ApiResponse;

    if (!result.ok) {
      setError(result.error);
      return null;
    }

    setMessage(successMessage);
    router.refresh();

    return result.data;
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("add-student");
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/series/${seriesId}/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId }),
    });

    await handleResponse(response, messages.series.updated);
    setPendingAction("");
  }

  async function removeStudent(removeStudentId: string) {
    setPendingAction(`remove-${removeStudentId}`);
    setError("");
    setMessage("");

    const response = await fetch(
      `/api/admin/series/${seriesId}/registrations/${removeStudentId}`,
      { method: "DELETE" },
    );

    await handleResponse(response, messages.series.updated);
    setPendingAction("");
  }

  async function addRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("add-round");
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/series/${seriesId}/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        testVersionId,
        title: roundTitle,
        roundNumber,
        scheduledAt,
        status: roundStatus,
      }),
    });

    const data = await handleResponse(response, messages.series.updated);

    if (data) {
      setRoundTitle("");
      setScheduledAt("");
      setRoundNumber(String(Number(roundNumber) + 1));
    }

    setPendingAction("");
  }

  async function launchRound(roundId: string) {
    setPendingAction(`launch-${roundId}`);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/series/rounds/${roundId}/launch`, {
      method: "POST",
    });
    const result = (await response.json()) as ApiResponse;
    setPendingAction("");

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.data.code) {
      router.push(`/host/${result.data.code}`);
    }
  }

  async function recalculate() {
    setPendingAction("recalculate");
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/series/${seriesId}/recalculate`, {
      method: "POST",
    });

    await handleResponse(response, messages.series.updated);
    setPendingAction("");
  }

  return (
    <div className="grid gap-6">
      {(error || message) ? (
        <div className="grid gap-2">
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          {message ? <p className="rounded-md bg-teal-50 p-3 text-sm font-medium text-teal-800">{message}</p> : null}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{messages.series.registrations}</h2>
            <p className="text-sm text-slate-500">{messages.series.registeredStudents}</p>
          </div>
          <form onSubmit={addStudent} className="flex flex-wrap gap-2">
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.displayName} ({student.username})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!studentId || pendingAction === "add-student"}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {messages.series.addStudent}
            </button>
          </form>
        </div>
        {registrations.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{messages.series.noRegisteredStudents}</p>
            <p className="mt-1">{messages.series.noRegisteredStudentsHelp}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
              >
                <div>
                  <p className="font-semibold">{registration.student.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {registration.student.username}
                    {registration.student.groupName ? ` - ${registration.student.groupName}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeStudent(registration.studentId)}
                  disabled={pendingAction === `remove-${registration.studentId}`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
                >
                  {messages.series.removeStudent}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{messages.series.rounds}</h2>
            <p className="text-sm text-slate-500">{messages.series.addRound}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/series/${seriesId}/leaderboard`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {messages.series.leaderboard}
            </Link>
            <button
              type="button"
              onClick={recalculate}
              disabled={pendingAction === "recalculate"}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              {pendingAction === "recalculate" ? messages.series.recalculating : messages.series.recalculate}
            </button>
          </div>
        </div>
        {versions.length === 0 ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            {messages.series.noPublishedTestsWarning}
          </p>
        ) : null}
        <form onSubmit={addRound} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.series.selectPublishedVersion}
              <select
                value={testVersionId}
                onChange={(event) => setTestVersionId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.test.title} - {messages.tests.versionPrefix} {version.versionNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.series.roundTitle}
              <input
                value={roundTitle}
                onChange={(event) => setRoundTitle(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.series.roundNumber}
              <input
                type="number"
                value={roundNumber}
                onChange={(event) => setRoundNumber(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                min={1}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.series.scheduledAt}
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.series.status}
              <select
                value={roundStatus}
                onChange={(event) => setRoundStatus(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {SERIES_ROUND_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={!testVersionId || pendingAction === "add-round"}
            className="w-fit rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {messages.series.addRound}
          </button>
        </form>
        {rounds.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{messages.series.noRounds}</p>
            <p className="mt-1">{messages.series.noRoundsHelp}</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {rounds.map((round) => (
              <article key={round.id} className="rounded-md border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {round.roundNumber}. {round.title}
                      </h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {round.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {round.testVersion.test.title} - {messages.tests.versionPrefix}{" "}
                      {round.testVersion.versionNumber}
                    </p>
                    {round.scheduledAt ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {messages.series.scheduledAt}: {new Date(round.scheduledAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {round.session ? (
                      <>
                        <Link
                          href={`/host/${round.session.code}`}
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          {messages.series.hostRound}
                        </Link>
                        <Link
                          href={`/admin/sessions/${round.session.code}/results`}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          {messages.series.roundResults}
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => launchRound(round.id)}
                        disabled={pendingAction === `launch-${round.id}`}
                        className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                      >
                        {pendingAction === `launch-${round.id}`
                          ? messages.series.launchingRound
                          : messages.series.launchRound}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
