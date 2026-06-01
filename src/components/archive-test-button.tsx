"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveTestButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function archiveTest() {
    setPending(true);
    await fetch(`/api/admin/tests/${id}`, {
      method: "DELETE",
    });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={archiveTest}
      disabled={pending}
      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
    >
      {pending ? "Архив..." : "Архивировать"}
    </button>
  );
}
