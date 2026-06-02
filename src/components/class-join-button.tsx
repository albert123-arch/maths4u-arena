"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function ClassJoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function joinClass() {
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/student/classes/${code}/join`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/student");
      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={joinClass}
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Joining..." : "Join class"}
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
