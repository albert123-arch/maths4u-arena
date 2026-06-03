"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
    }
  | { ok: false; error: string };

export function SessionLifecycleButton({
  code,
  action,
  apiPath,
  compact = false,
}: {
  code: string;
  action: "close" | "finish";
  apiPath?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isClose = action === "close";
  const label = isClose
    ? pending
      ? messages.teacher.closingSession
      : messages.teacher.closeSession
    : pending
      ? messages.host.finishing
      : messages.host.finish;
  const confirmMessage = isClose
    ? messages.teacher.closeSessionConfirm
    : messages.teacher.finishSessionConfirm;
  const target = apiPath ?? (isClose ? `/api/teacher/sessions/${code}/close` : `/api/sessions/${code}/finish`);

  async function submit() {
    if (pending) {
      return;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(target, {
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

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={
          compact
            ? "rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
            : "rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        }
      >
        {label}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
