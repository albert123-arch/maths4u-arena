"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { messages } from "@/lib/messages";

type StoredParticipant = {
  participantId: string;
  participantToken: string;
  displayName: string;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        participant: {
          id: string;
          displayName: string;
        };
        participantToken: string;
        session: {
          code: string;
        };
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
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function PlayJoinForm({
  initialCode = "",
  registeredStudent,
}: {
  initialCode?: string;
  registeredStudent?: {
    displayName: string;
  } | null;
}) {
  const router = useRouter();
  const displayNameRef = useRef<HTMLInputElement>(null);
  const normalizedInitialCode = initialCode.toUpperCase();
  const [code, setCode] = useState(normalizedInitialCode);
  const [displayName, setDisplayName] = useState(registeredStudent?.displayName ?? "");
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

  function updateCode(value: string) {
    const nextCode = value.toUpperCase();
    setCode(nextCode);
    setJoinAsAnother(false);
    setExistingParticipant(readStoredParticipant(nextCode));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/participants/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
        body: JSON.stringify({ code, displayName: registeredStudent?.displayName ?? displayName }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    localStorage.setItem(
      participantKey(result.data.session.code),
      JSON.stringify({
        participantId: result.data.participant.id,
        participantToken: result.data.participantToken,
        displayName: result.data.participant.displayName,
      }),
    );
    router.push(`/game/${result.data.session.code}`);
  }

  const showExisting = existingParticipant && !joinAsAnother;

  return (
    <div className="grid gap-4">
      {showExisting ? (
        <section className="grid gap-3 rounded-md border border-teal-200 bg-teal-50 p-4">
          <p className="font-semibold text-teal-950">
            {messages.play.alreadyJoined} {existingParticipant.displayName}.
          </p>
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
