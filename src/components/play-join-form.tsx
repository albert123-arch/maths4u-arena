"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: {
        participant: {
          id: string;
        };
        participantToken: string;
        session: {
          code: string;
        };
      };
    }
  | { ok: false; error: string };

export function PlayJoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/participants/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, displayName }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    localStorage.setItem(
      `maths4u_participant_${result.data.session.code}`,
      JSON.stringify({
        participantId: result.data.participant.id,
        participantToken: result.data.participantToken,
      }),
    );
    router.push(`/game/${result.data.session.code}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.play.gameCode}
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="rounded-md border border-slate-300 px-3 py-3 text-center text-2xl font-bold uppercase tracking-widest outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          maxLength={16}
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.play.displayName}
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          required
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.play.pending : messages.play.submit}
      </button>
    </form>
  );
}
