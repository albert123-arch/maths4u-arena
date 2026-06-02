"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

export function StudentLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/student/logout", {
      method: "POST",
    });
    router.push("/student/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? messages.adminShell.signingOut : messages.student.signOut}
    </button>
  );
}
