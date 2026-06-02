"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";
import { sessionSettingsJson } from "@/lib/session-settings";

type QuizSetOption = {
  testVersionId: string;
  title: string;
  questionCount: number;
};

type ClassOption = {
  id: string;
  title: string;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        code: string;
      };
    }
  | { ok: false; error: string };

export function TeacherQuickLaunchForm({
  quizSets,
  classrooms,
}: {
  quizSets: QuizSetOption[];
  classrooms: ClassOption[];
}) {
  const router = useRouter();
  const [testVersionId, setTestVersionId] = useState(quizSets[0]?.testVersionId ?? "");
  const [classId, setClassId] = useState(classrooms[0]?.id ?? "");
  const [mode, setMode] = useState<"CLASSIC" | "HOST_PACED">("CLASSIC");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    if (!testVersionId) {
      setError("Please choose a quiz set.");
      return;
    }

    if (!classId) {
      setError(messages.teacher.chooseClass);
      return;
    }

    setPending(true);
    setError("");

    try {
      const selectedQuizSet = quizSets.find((quizSet) => quizSet.testVersionId === testVersionId);
      const response = await fetch("/api/teacher/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testVersionId,
          mode,
          classId,
          showResults: true,
          settingsJson: sessionSettingsJson({
            audience: "CLASS",
            registeredOnly: true,
            classId,
            label: selectedQuizSet?.title ?? "",
            showStudentResults: true,
            showLeaderboard: true,
            showCorrectAnswers: false,
            autoSubmitOnFinish: mode === "HOST_PACED" ? false : true,
            phase: "LOBBY",
          }),
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error === messages.api.invalidInput ? messages.teacher.chooseClass : result.error);
        return;
      }

      router.push(`/host/${result.data.code}`);
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  const disabled = quizSets.length === 0 || classrooms.length === 0;

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-semibold uppercase text-slate-500">{messages.teacher.startLiveGame}</h2>
        <p className="mt-1 text-sm text-slate-600">Choose a quiz set and class, then launch.</p>
      </div>
      {quizSets.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Create your first quiz set before launching a class game.
        </p>
      ) : null}
      {classrooms.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {messages.teacher.createClassFirst}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
        <select
          value={testVersionId}
          onChange={(event) => setTestVersionId(event.target.value)}
          disabled={quizSets.length === 0}
          className="rounded-md border border-slate-300 px-3 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
        >
          {quizSets.map((quizSet) => (
            <option key={quizSet.testVersionId} value={quizSet.testVersionId}>
              {quizSet.title} ({quizSet.questionCount})
            </option>
          ))}
        </select>
        <select
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          disabled={classrooms.length === 0}
          className="rounded-md border border-slate-300 px-3 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
        >
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.title}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as "CLASSIC" | "HOST_PACED")}
          className="rounded-md border border-slate-300 px-3 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="CLASSIC">{messages.sessions.modeClassic}</option>
          <option value="HOST_PACED">{messages.sessions.modeHostPaced}</option>
        </select>
        <button
          type="submit"
          disabled={disabled || pending}
          className="rounded-md bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? messages.sessions.launching : messages.sessions.launch}
        </button>
      </div>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  );
}
