"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: {
        next: string;
      };
    }
  | { ok: false; error: string };

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/student";
}

export function StudentLoginForm({ next = "/student" }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/student/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        next: safeNext(next),
      }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(safeNext(result.data.next));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.student.username}
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="username"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.student.password}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? messages.student.signingIn : messages.student.signIn}
      </button>
    </form>
  );
}
