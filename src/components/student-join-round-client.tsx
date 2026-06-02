"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { messages } from "@/lib/messages";

type SessionTeam = {
  id: string;
  name: string;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        participantId?: string;
        participantToken: string;
        displayName?: string;
        code?: string;
        registeredOnly?: boolean;
        participant?: {
          id: string;
          displayName: string;
          teamId: string | null;
        };
        session?: {
          code: string;
        };
      };
    }
  | { ok: false; error: string };

function participantKey(code: string) {
  return `maths4u_participant_${code}`;
}

export function StudentJoinRoundClient({
  code,
  displayName,
  teamMode,
  teamAssignMode,
  teams,
}: {
  code: string;
  displayName: string;
  teamMode: boolean;
  teamAssignMode: "manual" | "auto";
  teams: SessionTeam[];
}) {
  const router = useRouter();
  const autoJoinStarted = useRef(false);
  const [teamId, setTeamId] = useState(teamMode ? teams[0]?.id ?? "" : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const joinRound = useCallback(async (selectedTeamId = teamId) => {
    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/participants/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          code,
          teamId: teamMode && teamAssignMode === "manual" ? selectedTeamId : null,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error || messages.api.seriesAccessCheckRequired);
        return;
      }

      const resultCode = result.data.code ?? result.data.session?.code ?? code;
      const resultParticipantId = result.data.participantId ?? result.data.participant?.id ?? "";
      const resultDisplayName = result.data.displayName ?? result.data.participant?.displayName ?? displayName;
      const resultTeamId = result.data.participant?.teamId ?? null;
      const selectedTeam = teams.find((team) => team.id === resultTeamId);

      localStorage.setItem(
        participantKey(resultCode),
        JSON.stringify({
          participantId: resultParticipantId,
          participantToken: result.data.participantToken,
          displayName: resultDisplayName,
          teamId: resultTeamId,
          teamName: selectedTeam?.name ?? "",
          registeredOnly: true,
        }),
      );
      router.replace(`/game/${resultCode}`);
    } catch {
      setError(messages.api.seriesAccessCheckRequired);
    } finally {
      setPending(false);
    }
  }, [code, displayName, pending, router, teamAssignMode, teamId, teamMode, teams]);

  useEffect(() => {
    if (teamMode && teamAssignMode === "manual") {
      return;
    }

    if (autoJoinStarted.current) {
      return;
    }

    autoJoinStarted.current = true;
    void joinRound();
  }, [joinRound, teamAssignMode, teamMode]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void joinRound(teamId);
  }

  return (
    <div className="grid gap-4">
      {teamMode && teamAssignMode === "manual" ? (
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            {messages.play.chooseTeam}
            <select
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              required
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending || !teamId}
            className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:opacity-60"
          >
            {pending ? messages.student.joiningRound : messages.play.joinAsRegisteredStudent}
          </button>
        </form>
      ) : (
        <div className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <p className="font-semibold">{pending ? messages.student.joiningRound : messages.play.joiningRegisteredRound}</p>
        </div>
      )}
      {error ? (
        <div className="grid gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{error}</p>
          <Link href="/student" className="font-semibold text-red-950 underline">
            {messages.student.backToDashboard}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
