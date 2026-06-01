"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      setSuccess(messages.register.success);
    } catch {
      setError(messages.register.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.register.nameOptional}
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="name"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.common.email}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="email"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.register.password}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-teal-800">{success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.register.pending : messages.register.submit}
      </button>
      <Link href="/admin/login" className="text-sm font-medium text-teal-800 hover:text-teal-900">
        {messages.register.loginLink}
      </Link>
    </form>
  );
}
