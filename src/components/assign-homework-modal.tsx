"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ASSIGNMENT_TYPES } from "@/lib/constants";
import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: { id: string };
    }
  | { ok: false; error: string };

export function AssignHomeworkModal({
  quizSetId,
  quizSetTitle,
  testVersionId,
  classrooms,
}: {
  quizSetId: string;
  quizSetTitle: string;
  testVersionId: string;
  classrooms: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(classrooms[0]?.id ?? "");
  const [title, setTitle] = useState(quizSetTitle);
  const [dueAt, setDueAt] = useState("");
  const [type, setType] = useState("HOMEWORK");
  const [showResultsToStudents, setShowResultsToStudents] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [allowPhotoSolutions, setAllowPhotoSolutions] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/teacher/sets/${quizSetId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testVersionId,
          classId,
          title,
          dueAt,
          type,
          showResultsToStudents,
          showCorrectAnswers,
          allowLateSubmission,
          allowPhotoSolutions,
        }),
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/teacher/assignments/${result.data.id}`);
      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={classrooms.length === 0}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        Assign Homework
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
          <form onSubmit={submit} className="grid w-full max-w-xl gap-4 rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Assign Homework</h2>
                <p className="mt-1 text-sm text-slate-600">{quizSetTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                {messages.common.close}
              </button>
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Class
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              >
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Type
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  {ASSIGNMENT_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Due date
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Show results" checked={showResultsToStudents} onChange={setShowResultsToStudents} />
              <Toggle label="Show correct answers" checked={showCorrectAnswers} onChange={setShowCorrectAnswers} />
              <Toggle label="Allow late submission" checked={allowLateSubmission} onChange={setAllowLateSubmission} />
              <Toggle label="Photo solutions coming next" checked={allowPhotoSolutions} onChange={setAllowPhotoSolutions} />
            </div>
            {allowPhotoSolutions ? (
              <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                Photo uploads will be enabled in the next update.
              </p>
            ) : null}
            {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {pending ? "Assigning..." : "Create assignment"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-teal-700"
      />
    </label>
  );
}
