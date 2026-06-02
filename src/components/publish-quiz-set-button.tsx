"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function PublishQuizSetButton({ draftVersionId }: { draftVersionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/teacher/test-versions/${draftVersionId}/publish`, {
        method: "POST",
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
        onClick={publish}
        disabled={pending}
        className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Publishing..." : "Publish Quiz Set"}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
