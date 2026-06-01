import Link from "next/link";

import { HostControls } from "@/components/host-controls";
import { messages } from "@/lib/messages";
import { sessionSettingsJson } from "@/lib/session-settings";
import { getLiveSessionData } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function HostPage({ params }: PageProps) {
  const { code } = await params;
  const live = await getLiveSessionData(code);

  if (!live) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <section className="grid gap-4">
          <h1 className="text-3xl font-bold">{messages.host.notFoundTitle}</h1>
          <Link href="/admin" className="font-semibold text-teal-300">
            {messages.common.backToAdmin}
          </Link>
        </section>
      </main>
    );
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const joinLink = `${appUrl || ""}/play?code=${live.code}`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto grid max-w-6xl gap-8">
        <HostControls
          initialLive={live}
          joinLink={joinLink}
          settingsJson={sessionSettingsJson(live.settings)}
        />
      </section>
    </main>
  );
}
