"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

export function ArchiveClassButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function archiveClass() {
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/teacher/classes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
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
        onClick={archiveClass}
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? messages.common.saving : messages.teacher.archiveClass}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

export function RemoveClassStudentButton({
  classId,
  studentId,
}: {
  classId: string;
  studentId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function removeStudent() {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      await fetch(`/api/teacher/classes/${classId}/members/${studentId}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={removeStudent}
      disabled={pending}
      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? messages.common.saving : messages.teacher.removeStudent}
    </button>
  );
}
