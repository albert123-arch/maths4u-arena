"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function HostControls({ code, status }: { code: string; status: string }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"START" | "FINISH" | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(action: "START" | "FINISH") {
    setPendingAction(action);
    setError("");

    const response = await fetch(`/api/sessions/${code}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    const result = (await response.json()) as ApiResponse;
    setPendingAction(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-3 rounded-md border border-slate-700 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold">{messages.host.controlsTitle}</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => updateStatus("START")}
          disabled={status === "RUNNING" || status === "FINISHED" || pendingAction !== null}
          className="rounded-md bg-teal-500 px-4 py-2 font-semibold text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "START" ? messages.host.starting : messages.host.start}
        </button>
        <button
          type="button"
          onClick={() => updateStatus("FINISH")}
          disabled={status === "FINISHED" || pendingAction !== null}
          className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "FINISH" ? messages.host.finishing : messages.host.finish}
        </button>
      </div>
      {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}
    </div>
  );
}
