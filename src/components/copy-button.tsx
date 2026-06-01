"use client";

import { useState } from "react";

import { messages } from "@/lib/messages";

export function CopyButton({
  value,
  label,
  copiedLabel = messages.common.copied,
  className = "",
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] ${className}`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
