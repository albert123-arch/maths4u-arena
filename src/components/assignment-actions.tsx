"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function AssignmentActions({
  assignmentId,
  status,
  studentLink,
}: {
  assignmentId: string;
  status: string;
  studentLink: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runAction(action: "assign" | "sync" | "close") {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/teacher/assignments/${assignmentId}/${action}`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(
        action === "assign"
          ? "Assignment is assigned."
          : action === "sync"
            ? "Class roster synced."
            : "Assignment is closed.",
      );
      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPendingAction("");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(studentLink);
      setMessage(messages.common.copied);
    } catch {
      setError(messages.api.unknownError);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <button
            type="button"
            onClick={() => runAction("assign")}
            disabled={Boolean(pendingAction)}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60"
          >
            {pendingAction === "assign" ? "Assigning..." : "Assign"}
          </button>
        ) : null}
        {status === "ASSIGNED" ? (
          <>
            <button
              type="button"
              onClick={() => runAction("sync")}
              disabled={Boolean(pendingAction)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            >
              {pendingAction === "sync" ? "Syncing..." : "Sync class roster"}
            </button>
            <button
              type="button"
              onClick={() => runAction("close")}
              disabled={Boolean(pendingAction)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-60"
            >
              {pendingAction === "close" ? "Closing..." : "Close assignment"}
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98]"
        >
          Copy student link
        </button>
      </div>
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
