"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ContentVisibilityValue } from "@/lib/constants";
import { messages } from "@/lib/messages";

type ContentKind = "tests" | "questions";

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function AdminLibraryVisibilityButton({
  kind,
  id,
  visibility,
  label,
}: {
  kind: ContentKind;
  id: string;
  visibility: ContentVisibilityValue;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function updateVisibility() {
    setPending(true);
    setError("");

    const response = await fetch(`/api/admin/library/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={updateVisibility}
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? messages.common.saving : label}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
