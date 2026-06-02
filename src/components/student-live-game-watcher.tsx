"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type LiveClassSession = {
  code: string;
  status: "LOBBY" | "RUNNING";
  mode: string;
  testTitle: string;
  sessionLabel: string;
  classTitle: string;
  createdAt: string;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        sessions: LiveClassSession[];
      };
    }
  | { ok: false; error: string };

function chooseSession(sessions: LiveClassSession[]) {
  return sessions.find((session) => session.status === "RUNNING") ?? sessions[0] ?? null;
}

export function StudentLiveGameWatcher({
  initialSessions,
}: {
  initialSessions: LiveClassSession[];
}) {
  const router = useRouter();
  const redirectedCode = useRef("");

  useEffect(() => {
    let stopped = false;

    function redirectToSession(session: LiveClassSession | null) {
      if (!session || redirectedCode.current === session.code) {
        return;
      }

      redirectedCode.current = session.code;
      router.replace(`/play?code=${session.code}`);
    }

    redirectToSession(chooseSession(initialSessions));

    async function pollLiveGames() {
      try {
        const response = await fetch("/api/student/live-games", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as ApiResponse;

        if (!stopped && result.ok) {
          redirectToSession(chooseSession(result.data.sessions));
        }
      } catch {
        // Keep the student dashboard stable if a silent poll fails.
      }
    }

    const interval = window.setInterval(pollLiveGames, 3000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [initialSessions, router]);

  return null;
}
