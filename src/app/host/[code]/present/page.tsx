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
      <section className="grid gap-4">
        <h1 className="text-3xl font-bold">{messages.host.notFoundTitle}</h1>
        <Link href="/admin" className="font-semibold text-teal-300">
          {messages.common.backToAdmin}
        </Link>
      </section>
    </main>
  );
}

export default async function HostPresenterPage({ params }: PageProps) {
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
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
        <section className="mx-auto grid max-w-7xl gap-8">
          <HostPacedHostControls
            initialLive={hostPacedLive}
            joinLink={joinLink}
            settingsJson={sessionSettingsJson(hostPacedLive.settings)}
            presenterMode
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
