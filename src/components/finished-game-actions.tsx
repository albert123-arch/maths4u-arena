"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { messages } from "@/lib/messages";

function hasStoredParticipant(code: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = localStorage.getItem(`maths4u_participant_${code}`);

  if (!stored) {
    return false;
  }

  try {
    const parsed = JSON.parse(stored) as { participantId?: unknown; participantToken?: unknown };

    return typeof parsed.participantId === "string" && typeof parsed.participantToken === "string";
  } catch {
    return false;
  }
}

export function FinishedGameActions({ code }: { code: string }) {
  const [canViewResults, setCanViewResults] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanViewResults(hasStoredParticipant(code));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [code]);

  return (
    <>
      {canViewResults ? (
        <Link
          href={`/game/${code}/results`}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {messages.game.viewMyResults}
        </Link>
      ) : null}
      <Link
        href="/student"
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
      >
        {messages.student.backToDashboard}
      </Link>
      <Link
        href="/play"
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        {messages.play.joinAnotherGame}
      </Link>
    </>
  );
}
