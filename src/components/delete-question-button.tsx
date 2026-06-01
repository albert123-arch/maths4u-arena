"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { messages } from "@/lib/messages";

export function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function deleteQuestion() {
    setPending(true);
    await fetch(`/api/admin/questions/${id}`, {
      method: "DELETE",
    });
    setPending(false);
    router.push("/admin/questions");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={deleteQuestion}
      disabled={pending}
      className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? messages.questions.deletingButton : messages.questions.deleteButton}
    </button>
  );
}
