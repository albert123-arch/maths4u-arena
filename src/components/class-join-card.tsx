"use client";

import { QRCodeSVG } from "qrcode.react";

import { messages } from "@/lib/messages";

import { CopyButton } from "./copy-button";

export function ClassJoinCard({
  joinCode,
  joinLink,
}: {
  joinCode: string;
  joinLink: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mx-auto rounded-md bg-white p-3">
        <QRCodeSVG value={joinLink} size={220} level="M" />
      </div>
      <p className="text-center text-4xl font-black tracking-[0.18em] text-slate-950">{joinCode}</p>
      <p className="break-all text-center text-sm text-slate-600">{joinLink}</p>
      <div className="grid grid-cols-2 gap-2">
        <CopyButton value={joinLink} label={messages.host.copyJoinLink} />
        <CopyButton value={joinCode} label={messages.host.copyGameCode} />
      </div>
    </div>
  );
}
