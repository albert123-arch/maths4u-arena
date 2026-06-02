"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: { next: string };
    }
  | { ok: false; error: string };

export function StudentRegisterForm({ next = "/student" }: { next?: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          password,
          confirmPassword,
          next,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const classCode = result.data.next.match(/^\/join-class\/([^/?#]+)/)?.[1];

      if (classCode) {
        await fetch(`/api/student/classes/${classCode}/join`, { method: "POST" });
        router.push("/student");
        router.refresh();
        return;
      }

      router.push(result.data.next);
      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.student.username}
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="username"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.student.password}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Confirm PIN/password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            autoComplete="new-password"
            required
          />
        </label>
      </div>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.common.creating : "Create student account"}
      </button>
    </form>
  );
}
