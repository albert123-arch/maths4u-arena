"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { DEFAULT_SESSION_SETTINGS, sessionSettingsJson } from "@/lib/session-settings";
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
  { mode: "CLASSIC", label: "Classic", available: true },
  { mode: "HOST_PACED", label: "Host-paced", available: false },
  { mode: "ACCURACY", label: "Accuracy", available: false },
  { mode: "TEAM", label: "Team", available: false },
  { mode: "PRACTICE", label: "Practice", available: false },
  { mode: "CAROUSEL", label: "Carousel", available: false },
];

export function LaunchSessionModal({
  testTitle,
  versionTitle,
  testVersionId,
  questionCount,
}: {
  testTitle: string;
  versionTitle: string;
  testVersionId: string;
  questionCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  async function launch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        testVersionId,
        mode: "CLASSIC",
        settingsJson: sessionSettingsJson({
          ...DEFAULT_SESSION_SETTINGS,
          label,
        }),
        showResults: true,
      }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCode(result.data.code);
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
                        className={`rounded-md border p-4 text-left transition ${
                          card.available
                            ? "border-teal-400 bg-teal-50 shadow-sm"
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
                {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:opacity-60"
                >
                  {pending ? messages.sessions.launching : messages.sessions.launchClassic}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
