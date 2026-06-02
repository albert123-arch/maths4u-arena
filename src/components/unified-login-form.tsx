"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: {
        role: "ADMIN" | "TEACHER" | "STUDENT";
        redirectTo: string;
      };
    }
  | { ok: false; error: string };

function safeNext(value?: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "";
}

export function UnifiedLoginForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const safeNextValue = safeNext(next);
  const registerHref = safeNextValue
    ? `/student/register?next=${encodeURIComponent(safeNextValue)}`
    : "/student/register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          next: safeNextValue || undefined,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    } catch {
      setError(messages.login.invalid);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.login.identifier}
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          placeholder={messages.login.identifierPlaceholder}
          autoComplete="username"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.login.password}
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
        {pending ? messages.login.pending : messages.login.submit}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={registerHref} className="font-semibold text-teal-800 hover:text-teal-950">
          {messages.login.createStudentAccount}
        </Link>
        <Link href="/" className="font-semibold text-slate-700 hover:text-slate-950">
          {messages.login.backHome}
        </Link>
      </div>
    </form>
  );
}
