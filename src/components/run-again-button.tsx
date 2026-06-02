"use client";

import { useRouter } from "next/navigation";
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

export function RunAgainButton({
  testVersionId,
  mode = "CLASSIC",
  settingsJson,
  compact = false,
}: {
  testVersionId: string;
  mode?: string;
  settingsJson?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function runAgain() {
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testVersionId,
          mode,
          settingsJson: settingsJson ?? null,
          showResults: true,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/host/${result.data.code}`);
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={runAgain}
        disabled={pending}
        className={
          compact
            ? "rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            : "rounded-md bg-teal-600 px-4 py-2 font-semibold text-white transition hover:bg-teal-500 active:scale-[0.98] disabled:opacity-60"
        }
      >
        {pending ? messages.sessions.launching : messages.sessions.runAgain}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
