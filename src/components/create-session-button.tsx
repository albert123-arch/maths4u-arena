"use client";

import Link from "next/link";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: {
        code: string;
      };
    }
  | { ok: false; error: string };

export function CreateSessionButton({ testVersionId }: { testVersionId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  async function createSession() {
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
        settingsJson: null,
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

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={createSession}
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.sessions.creating : messages.sessions.create}
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {code ? (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-semibold text-slate-700">
            {messages.sessions.createdCode} {code}
          </span>
          <Link href={`/host/${code}`} className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.sessions.hostLink}
          </Link>
          <Link href={`/game/${code}`} className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.sessions.gameLink}
          </Link>
          <Link href="/play" className="font-semibold text-teal-800 hover:text-teal-950">
            {messages.sessions.playLink}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
