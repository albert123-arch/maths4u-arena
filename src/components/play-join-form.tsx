"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { messages } from "@/lib/messages";
import { DEFAULT_SESSION_SETTINGS, type SessionSettings } from "@/lib/session-settings";

type StoredParticipant = {
  participantId: string;
  participantToken: string;
  displayName: string;
  teamId?: string | null;
  teamName?: string;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        participant: {
          id: string;
          displayName: string;
          teamId: string | null;
        };
        participantToken: string;
        session: {
          code: string;
        };
      };
    }
  | { ok: false; error: string };

type LiveApiResponse =
  | {
      ok: true;
      data: {
        settings: SessionSettings;
      };
    }
  | { ok: false; error: string };

function participantKey(code: string) {
  return `maths4u_participant_${code}`;
}

function readStoredParticipant(code: string): StoredParticipant | null {
  if (!code || typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(participantKey(code));

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredParticipant>;

    if (parsed.participantId && parsed.participantToken && parsed.displayName) {
      return {
        participantId: parsed.participantId,
        participantToken: parsed.participantToken,
        displayName: parsed.displayName,
        teamId: typeof parsed.teamId === "string" ? parsed.teamId : null,
        teamName: typeof parsed.teamName === "string" ? parsed.teamName : "",
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function PlayJoinForm({
  initialCode = "",
  initialSettings,
  registeredStudent,
}: {
  initialCode?: string;
  initialSettings: SessionSettings;
  registeredStudent?: {
    displayName: string;
  } | null;
}) {
  const router = useRouter();
  const displayNameRef = useRef<HTMLInputElement>(null);
  const normalizedInitialCode = initialCode.toUpperCase();
  const [code, setCode] = useState(normalizedInitialCode);
  const [settings, setSettings] = useState(initialSettings);
  const [displayName, setDisplayName] = useState(registeredStudent?.displayName ?? "");
  const [teamId, setTeamId] = useState(initialSettings.teamMode ? initialSettings.teams[0]?.id ?? "" : "");
  const [existingParticipant, setExistingParticipant] = useState<StoredParticipant | null>(null);
  const [joinAsAnother, setJoinAsAnother] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (normalizedInitialCode) {
      if (!registeredStudent) {
        displayNameRef.current?.focus();
      }
      const timer = window.setTimeout(() => {
        setExistingParticipant(readStoredParticipant(normalizedInitialCode));
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [normalizedInitialCode, registeredStudent]);

  useEffect(() => {
    if (!code || code.length < 4 || code === normalizedInitialCode) {
      return;
    }

    let stopped = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/sessions/${code}/live`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as LiveApiResponse;

        if (!stopped && result.ok) {
          setSettings(result.data.settings);
          setTeamId(result.data.settings.teamMode ? result.data.settings.teams[0]?.id ?? "" : "");
        }
      } catch {
        // Team settings lookup is best-effort and does not poll.
      }
    }, 350);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [code, normalizedInitialCode]);

  function updateCode(value: string) {
    const nextCode = value.toUpperCase();
    setCode(nextCode);
    setJoinAsAnother(false);
    setExistingParticipant(readStoredParticipant(nextCode));
    if (nextCode === normalizedInitialCode) {
      setSettings(initialSettings);
      setTeamId(initialSettings.teamMode ? initialSettings.teams[0]?.id ?? "" : "");
    } else {
      setSettings(DEFAULT_SESSION_SETTINGS);
      setTeamId("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/participants/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          displayName: registeredStudent?.displayName ?? displayName,
          teamId: settings.teamMode ? teamId : null,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const selectedTeam = settings.teams.find((team) => team.id === result.data.participant.teamId);

      localStorage.setItem(
        participantKey(result.data.session.code),
        JSON.stringify({
          participantId: result.data.participant.id,
          participantToken: result.data.participantToken,
          displayName: result.data.participant.displayName,
          teamId: result.data.participant.teamId,
          teamName: selectedTeam?.name ?? "",
        }),
      );
      router.push(`/game/${result.data.session.code}`);
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  const showExisting = existingParticipant && !joinAsAnother;

  return (
    <div className="grid gap-4">
      {showExisting ? (
        <section className="grid gap-3 rounded-md border border-teal-200 bg-teal-50 p-4">
          <p className="font-semibold text-teal-950">
            {messages.play.alreadyJoined} {existingParticipant.displayName}.
          </p>
          {existingParticipant.teamName ? (
            <p className="text-sm font-semibold text-teal-900">
              {messages.play.team}: {existingParticipant.teamName}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push(`/game/${code}`)}
              className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98]"
            >
              {messages.play.continue}
            </button>
            {!registeredStudent ? (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(participantKey(code));
                  setExistingParticipant(null);
                  setJoinAsAnother(true);
                  window.setTimeout(() => displayNameRef.current?.focus(), 0);
                }}
                className="rounded-md border border-teal-300 px-4 py-2 font-semibold text-teal-950 transition hover:bg-white active:scale-[0.98]"
              >
                {messages.play.joinAnother}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.play.gameCode}
          <input
            value={code}
            onChange={(event) => updateCode(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-3 text-center text-2xl font-bold uppercase tracking-widest outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            maxLength={16}
            required
          />
        </label>
        {registeredStudent ? (
          <div className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
            <p className="font-semibold">{messages.play.registeredSession}</p>
            <p className="mt-1">
              {messages.play.continueAs} {registeredStudent.displayName}
            </p>
          </div>
        ) : (
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            {messages.play.displayName}
            <input
              ref={displayNameRef}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              required
            />
          </label>
        )}
        {settings.teamMode ? (
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            {messages.play.chooseTeam}
            <select
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              required
            >
              {settings.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || Boolean(showExisting)}
          className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? messages.play.pending : messages.play.submit}
        </button>
      </form>
    </div>
  );
}
