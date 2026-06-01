"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json()) as ApiResponse;

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
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
        {messages.adminLogin.password}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.adminLogin.signingIn : messages.adminLogin.signIn}
      </button>
    </form>
  );
}
