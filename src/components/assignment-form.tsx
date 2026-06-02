"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { ASSIGNMENT_TYPES } from "@/lib/constants";
import { messages } from "@/lib/messages";

type ApiResponse =
  | {
      ok: true;
      data: { id: string };
    }
  | { ok: false; error: string };

type AssignmentClass = {
  id: string;
  title: string;
};

type AssignmentTest = {
  id: string;
  title: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    title: string;
    _count: { questions: number };
  }>;
};

type AssignmentInitial = {
  id: string;
  title: string;
  description: string | null;
  classId: string;
  testVersionId: string;
  type: string;
  openAt: string;
  dueAt: string;
  timeLimitMinutes: number | null;
  attemptsAllowed: number;
  showResultsToStudents: boolean;
  showCorrectAnswers: boolean;
  allowLateSubmission: boolean;
  allowPhotoSolutions: boolean;
  settingsJson: string | null;
};

export function AssignmentForm({
  classes,
  tests,
  initial,
  mode = "create",
}: {
  classes: AssignmentClass[];
  tests: AssignmentTest[];
  initial?: AssignmentInitial;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const publishedVersions = useMemo(
    () =>
      tests.flatMap((test) =>
        test.versions.map((version) => ({
          ...version,
          label: `${test.title} - Version ${version.versionNumber} (${version._count.questions} questions)`,
        })),
      ),
    [tests],
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [classId, setClassId] = useState(initial?.classId ?? classes[0]?.id ?? "");
  const [testVersionId, setTestVersionId] = useState(
    initial?.testVersionId ?? publishedVersions[0]?.id ?? "",
  );
  const [type, setType] = useState(initial?.type ?? "HOMEWORK");
  const [openAt, setOpenAt] = useState(initial?.openAt ?? "");
  const [dueAt, setDueAt] = useState(initial?.dueAt ?? "");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initial?.timeLimitMinutes ? String(initial.timeLimitMinutes) : "",
  );
  const [attemptsAllowed, setAttemptsAllowed] = useState(String(initial?.attemptsAllowed ?? 1));
  const [showResultsToStudents, setShowResultsToStudents] = useState(
    initial?.showResultsToStudents ?? true,
  );
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(initial?.showCorrectAnswers ?? false);
  const [allowLateSubmission, setAllowLateSubmission] = useState(
    initial?.allowLateSubmission ?? false,
  );
  const [allowPhotoSolutions, setAllowPhotoSolutions] = useState(
    initial?.allowPhotoSolutions ?? false,
  );
  const [settingsJson, setSettingsJson] = useState(initial?.settingsJson ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        mode === "edit" && initial ? `/api/teacher/assignments/${initial.id}` : "/api/teacher/assignments",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            classId,
            testVersionId,
            type,
            openAt,
            dueAt,
            timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
            attemptsAllowed: Number(attemptsAllowed || 1),
            showResultsToStudents,
            showCorrectAnswers,
            allowLateSubmission,
            allowPhotoSolutions,
            settingsJson,
          }),
        },
      );
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(mode === "edit" ? "Assignment saved." : "Assignment created.");

      if (mode === "create") {
        router.push(`/teacher/assignments/${result.data.id}`);
        return;
      }

      router.refresh();
    } catch {
      setError(messages.api.unknownError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
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
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Class
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          >
            {classes.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Published test version
          <select
            value={testVersionId}
            onChange={(event) => setTestVersionId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          >
            {publishedVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {publishedVersions.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          This test must have a published version before it can be assigned.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Opens at
          <input
            type="datetime-local"
            value={openAt}
            onChange={(event) => setOpenAt(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Due at
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Time limit minutes
          <input
            type="number"
            min="1"
            value={timeLimitMinutes}
            onChange={(event) => setTimeLimitMinutes(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Attempts allowed
          <input
            type="number"
            min="1"
            value={attemptsAllowed}
            onChange={(event) => setAttemptsAllowed(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
      </div>
      <div className="grid gap-3 rounded-md border border-slate-200 p-4 sm:grid-cols-2">
        <CheckRow
          checked={showResultsToStudents}
          label="Show results to students"
          onChange={setShowResultsToStudents}
        />
        <CheckRow
          checked={showCorrectAnswers}
          label="Show correct answers"
          onChange={setShowCorrectAnswers}
        />
        <CheckRow
          checked={allowLateSubmission}
          label="Allow late submission"
          onChange={setAllowLateSubmission}
        />
        <CheckRow
          checked={allowPhotoSolutions}
          label="Allow photo solutions placeholder"
          onChange={setAllowPhotoSolutions}
        />
      </div>
      {allowPhotoSolutions ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Photo uploads will be enabled in the next update.
        </p>
      ) : null}
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Settings JSON
        <textarea
          value={settingsJson}
          onChange={(event) => setSettingsJson(event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          placeholder='{ "notes": "" }'
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      <button
        type="submit"
        disabled={pending || classes.length === 0 || publishedVersions.length === 0}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? messages.common.saving : mode === "create" ? "Create Assignment" : messages.common.save}
      </button>
    </form>
  );
}

function CheckRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-teal-700"
      />
      <span>{label}</span>
    </label>
  );
}
