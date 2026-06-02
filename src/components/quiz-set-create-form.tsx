"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export function QuizSetCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [gradeLevel, setGradeLevel] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/teacher/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, subject, gradeLevel, visibility }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/teacher/sets/${result.data.id}/edit`);
      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Subject
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Grade / Level
          <input
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            placeholder="Example: Grade 6"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Visibility
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="PRIVATE">Private</option>
            <option value="PUBLIC">Shared</option>
          </select>
        </label>
      </div>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.common.creating : "Create Quiz Set"}
      </button>
    </form>
  );
}
