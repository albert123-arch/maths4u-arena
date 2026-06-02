"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ClassCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();

    if (!normalized) {
      return;
    }

    router.push(`/join-class/${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Class code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base uppercase outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          autoComplete="off"
          inputMode="text"
          required
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99]"
      >
        Join class
      </button>
    </form>
  );
}
