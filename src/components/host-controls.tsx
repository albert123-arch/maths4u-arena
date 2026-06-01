"use client";

import { useEffect, useState } from "react";

import { messages } from "@/lib/messages";

type LiveSessionData = {
  status: "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED";
  participantCount: number;
  answerCount: number;
  serverTime: string;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        status: LiveSessionData["status"];
      };
    }
  | { ok: false; error: string };

export function HostControls({
  code,
  initialStatus,
  initialParticipantCount,
  initialAnswerCount,
}: {
  code: string;
  initialStatus: LiveSessionData["status"];
  initialParticipantCount: number;
  initialAnswerCount: number;
}) {
  const [live, setLive] = useState<LiveSessionData>({
    status: initialStatus,
    participantCount: initialParticipantCount,
    answerCount: initialAnswerCount,
    serverTime: "",
  });
  const [pendingAction, setPendingAction] = useState<"START" | "FINISH" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;

    async function pollLiveStatus() {
      try {
        const response = await fetch(`/api/sessions/${code}/live`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LiveSessionData;

        if (!stopped) {
          setLive(data);
        }
      } catch {
        // Keep the last host state when a silent poll fails.
      }
    }

    const interval = window.setInterval(pollLiveStatus, 2000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [code]);

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

    setLive((current) => ({
      ...current,
      status: result.data.status,
    }));
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">{messages.host.status}</p>
          <p className="mt-2 text-2xl font-bold">{live.status}</p>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">{messages.host.participants}</p>
          <p className="mt-2 text-2xl font-bold">{live.participantCount}</p>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">{messages.host.answers}</p>
          <p className="mt-2 text-2xl font-bold">{live.answerCount}</p>
        </div>
      </div>
      <div className="grid gap-3 rounded-md border border-slate-700 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold">{messages.host.controlsTitle}</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => updateStatus("START")}
            disabled={live.status === "RUNNING" || live.status === "FINISHED" || pendingAction !== null}
            className="rounded-md bg-teal-500 px-4 py-2 font-semibold text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "START" ? messages.host.starting : messages.host.start}
          </button>
          <button
            type="button"
            onClick={() => updateStatus("FINISH")}
            disabled={live.status === "FINISHED" || pendingAction !== null}
            className="rounded-md border border-slate-600 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "FINISH" ? messages.host.finishing : messages.host.finish}
          </button>
        </div>
        {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
