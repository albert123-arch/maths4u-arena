"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | { ok: true; data: { id?: string; visibility?: string } }
  | { ok: false; error: string };

export function QuizSetActions({
  id,
  visibility,
  compact = false,
}: {
  id: string;
  visibility: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function run(action: "duplicate" | "share" | "copy") {
    if (pending) {
      return;
    }

    setPending(action);
    setError("");

    try {
      if (action === "copy") {
        await navigator.clipboard.writeText(`${window.location.origin}/teacher/sets/${id}/edit`);
        setPending("");
        return;
      }

      const response = await fetch(
        action === "duplicate" ? `/api/teacher/sets/${id}/duplicate` : `/api/teacher/sets/${id}/share`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:
            action === "share"
              ? JSON.stringify({ visibility: visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC" })
              : undefined,
        },
      );
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (action === "duplicate" && result.data.id) {
        router.push(`/teacher/sets/${result.data.id}/edit`);
        return;
      }

      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending("");
    }
  }

  return (
    <div className={`grid gap-1 ${compact ? "" : "min-w-36"}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run("share")}
          disabled={Boolean(pending)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          {pending === "share"
            ? messages.common.saving
            : visibility === "PUBLIC"
              ? "Unshare"
              : "Share"}
        </button>
        <button
          type="button"
          onClick={() => run("duplicate")}
          disabled={Boolean(pending)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          {pending === "duplicate" ? messages.common.creating : "Duplicate"}
        </button>
        <button
          type="button"
          onClick={() => run("copy")}
          disabled={Boolean(pending)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          Copy link
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
