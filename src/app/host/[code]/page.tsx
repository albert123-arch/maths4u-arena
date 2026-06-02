import Link from "next/link";

import { HostControls } from "@/components/host-controls";
import { HostPacedHostControls } from "@/components/host-paced-host-controls";
import { getHostPacedHostLiveData } from "@/lib/host-paced";
import { messages } from "@/lib/messages";
import { sessionSettingsJson } from "@/lib/session-settings";
import { getLiveSessionData } from "@/lib/session-live";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

function notFoundContent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
      <section className="grid gap-4 rounded-md border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-3xl font-bold">{messages.host.notFoundTitle}</h1>
        <p className="text-sm text-slate-300">{messages.host.notFoundDescription}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/admin/sessions"
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400"
          >
            {messages.results.back}
          </Link>
          <Link
            href="/admin"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
          >
            {messages.common.backToAdmin}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function HostPage({ params }: PageProps) {
  const { code } = await params;
  const live = await getLiveSessionData(code);

  if (!live) {
    return notFoundContent();
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const joinLink = `${appUrl || ""}/play?code=${live.code}`;

  if (live.mode === "HOST_PACED") {
    const hostPacedLive = await getHostPacedHostLiveData(live.code);

    if (!hostPacedLive) {
      return notFoundContent();
    }

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <section className="mx-auto grid max-w-6xl gap-8">
          <HostPacedHostControls
            initialLive={hostPacedLive}
            joinLink={joinLink}
            settingsJson={sessionSettingsJson(hostPacedLive.settings)}
          />
        </section>
      </main>
    );
  }

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
