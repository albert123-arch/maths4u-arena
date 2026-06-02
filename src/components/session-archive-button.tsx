"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: {
        archived: boolean;
      };
    }
  | { ok: false; error: string };

export function SessionArchiveButton({
  code,
  action,
  apiBase = "/api/teacher/sessions",
  compact = false,
}: {
  code: string;
  action: "archive" | "restore";
  apiBase?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`${apiBase}/${code}/${action}`, {
        method: "POST",
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  const label =
    action === "archive"
      ? pending
        ? messages.teacher.archivingSession
        : messages.teacher.archiveSession
      : pending
        ? messages.teacher.restoringSession
        : messages.teacher.restoreSession;

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={
          compact
            ? "rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
            : "rounded-md border border-slate-600 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        }
      >
        {label}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
