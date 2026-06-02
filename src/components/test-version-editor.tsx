"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { messages } from "@/lib/messages";

import { LaunchSessionModal } from "./launch-session-modal";

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

type VersionSummary = {
  id: string;
  versionNumber: number;
  title: string;
  status: string;
  publishedAt: string | Date | null;
  _count: {
    questions: number;
  };
};

type QuestionBankItem = {
  id: string;
  prompt: string;
  type: string;
  subject: string;
  difficulty: number;
};

type AttachedQuestion = {
  id: string;
  questionId: string;
  sortOrder: number;
  points: number;
  timeLimitSeconds: number | null;
  question: QuestionBankItem;
};

type DraftVersion = {
  id: string;
  versionNumber: number;
  title: string;
  instructions: string | null;
  settingsJson: string | null;
  status: string;
  questions: AttachedQuestion[];
};

function versionDate(value: string | Date | null) {
  if (!value) {
    return messages.tests.unpublished;
  }

  return new Date(value).toLocaleString();
}

export function TestVersionEditor({
  testTitle,
  testId,
  versions,
  draftVersion,
  questionBank,
  apiBase = "/api/admin",
  showLaunch = true,
}: {
  testTitle: string;
  testId: string;
  versions: VersionSummary[];
  draftVersion: DraftVersion | null;
  questionBank: QuestionBankItem[];
  apiBase?: string;
  showLaunch?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(draftVersion?.title ?? "");
  const [instructions, setInstructions] = useState(draftVersion?.instructions ?? "");
  const [settingsJson, setSettingsJson] = useState(draftVersion?.settingsJson ?? "");
  const [questionId, setQuestionId] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const attachedQuestions = useMemo(
    () => [...(draftVersion?.questions ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
    [draftVersion?.questions],
  );
  const attachedIds = new Set(attachedQuestions.map((item) => item.questionId));
  const availableQuestions = questionBank.filter((question) => !attachedIds.has(question.id));

  async function handleResponse(response: Response, successMessage: string) {
    const result = (await response.json()) as ApiResponse;

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    setMessage(successMessage);
    router.refresh();
    return true;
  }

  async function createDraft() {
    setPending("draft");
    setError("");
    setMessage("");

    await handleResponse(
      await fetch(`${apiBase}/tests/${testId}/versions/draft`, { method: "POST" }),
      messages.tests.draftCreated,
    );
    setPending("");
  }

  async function saveVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftVersion) {
      return;
    }

    setPending("version");
    setError("");
    setMessage("");

    await handleResponse(
      await fetch(`${apiBase}/test-versions/${draftVersion.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          instructions,
          settingsJson,
        }),
      }),
      messages.tests.versionSaved,
    );
    setPending("");
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftVersion || !questionId) {
      return;
    }

    setPending("add-question");
    setError("");
    setMessage("");

    const added = await handleResponse(
      await fetch(`${apiBase}/test-versions/${draftVersion.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionId }),
      }),
      messages.tests.questionAttached,
    );

    if (added) {
      setQuestionId("");
    }

    setPending("");
  }

  async function reorder(index: number, direction: -1 | 1) {
    if (!draftVersion) {
      return;
    }

    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= attachedQuestions.length) {
      return;
    }

    const orderedIds = attachedQuestions.map((item) => item.id);
    [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
    setPending("reorder");
    setError("");
    setMessage("");

    await handleResponse(
      await fetch(`${apiBase}/test-versions/${draftVersion.id}/questions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderedIds }),
      }),
      messages.tests.questionsReordered,
    );
    setPending("");
  }

  async function updateQuestionLink(item: AttachedQuestion, formData: FormData) {
    setPending(item.id);
    setError("");
    setMessage("");

    await handleResponse(
      await fetch(`${apiBase}/test-version-questions/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: formData.get("points"),
          timeLimitSeconds: formData.get("timeLimitSeconds"),
        }),
      }),
      messages.tests.questionSettingsSaved,
    );
    setPending("");
  }

  async function removeQuestion(item: AttachedQuestion) {
    setPending(item.id);
    setError("");
    setMessage("");

    await handleResponse(
      await fetch(`${apiBase}/test-version-questions/${item.id}`, { method: "DELETE" }),
      messages.tests.questionRemoved,
    );
    setPending("");
  }

  async function publishVersion() {
    if (!draftVersion) {
      return;
    }

    setPending("publish");
    setError("");
    setMessage("");

    await handleResponse(
      await fetch(`${apiBase}/test-versions/${draftVersion.id}/publish`, { method: "POST" }),
      messages.tests.versionPublished,
    );
    setPending("");
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{messages.tests.versionsTitle}</h2>
        <div className="mt-4 grid gap-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold">
                  {messages.tests.versionPrefix} {version.versionNumber}: {version.title}
                </p>
                <p className="text-sm text-slate-600">
                  {version.status} - {version._count.questions} {messages.tests.questionCount} -{" "}
                  {versionDate(version.publishedAt)}
                </p>
              </div>
              {showLaunch && version.status === "PUBLISHED" ? (
                <LaunchSessionModal
                  testTitle={testTitle}
                  versionTitle={`${messages.tests.versionPrefix} ${version.versionNumber}`}
                  testVersionId={version.id}
                  questionCount={version._count.questions}
                />
              ) : null}
            </div>
          ))}
          {versions.length === 0 ? (
            <p className="text-sm text-slate-600">{messages.tests.noVersions}</p>
          ) : null}
        </div>
      </div>

      {!draftVersion ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-5">
          <h2 className="text-xl font-semibold">{messages.tests.noDraftTitle}</h2>
          <p className="mt-2 text-sm text-slate-600">{messages.tests.noDraftDescription}</p>
          <button
            type="button"
            onClick={createDraft}
            disabled={pending === "draft"}
            className="mt-4 rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending === "draft" ? messages.tests.creatingDraft : messages.tests.createDraft}
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          <form onSubmit={saveVersion} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">
                {messages.tests.draftTitle} {draftVersion.versionNumber}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{messages.tests.draftDescription}</p>
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.tests.versionTitle}
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.tests.instructions}
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.tests.settingsJson}
              <textarea
                value={settingsJson}
                onChange={(event) => setSettingsJson(event.target.value)}
                className="min-h-24 font-mono rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder='{"shuffleQuestions": false}'
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending === "version"}
                className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {pending === "version" ? messages.common.saving : messages.common.save}
              </button>
              <button
                type="button"
                onClick={publishVersion}
                disabled={pending === "publish"}
                className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {pending === "publish" ? messages.tests.publishing : messages.tests.publish}
              </button>
            </div>
          </form>

          <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">{messages.tests.attachedQuestions}</h2>
              <p className="mt-1 text-sm text-slate-600">{messages.tests.attachedQuestionsDescription}</p>
            </div>
            <form onSubmit={addQuestion} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={questionId}
                onChange={(event) => setQuestionId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">{messages.tests.selectQuestion}</option>
                {availableQuestions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.subject} - {question.type} - {question.prompt.slice(0, 90)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!questionId || pending === "add-question"}
                className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {pending === "add-question" ? messages.tests.addingQuestion : messages.tests.addQuestion}
              </button>
            </form>
            {attachedQuestions.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                {messages.tests.noAttachedQuestions}
              </p>
            ) : (
              <div className="grid gap-3">
                {attachedQuestions.map((item, index) => (
                  <article key={item.id} className="grid gap-4 rounded-md border border-slate-200 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          {messages.game.questionLabel} {index + 1}
                        </p>
                        <h3 className="mt-1 font-semibold">{item.question.prompt}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.question.subject} - {item.question.type} -{" "}
                          {messages.questions.fields.difficulty} {item.question.difficulty}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => reorder(index, -1)}
                          disabled={index === 0 || pending === "reorder"}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        >
                          {messages.tests.moveUp}
                        </button>
                        <button
                          type="button"
                          onClick={() => reorder(index, 1)}
                          disabled={index === attachedQuestions.length - 1 || pending === "reorder"}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        >
                          {messages.tests.moveDown}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(item)}
                          disabled={pending === item.id}
                          className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {messages.tests.removeQuestion}
                        </button>
                      </div>
                    </div>
                    <form
                      action={(formData) => updateQuestionLink(item, formData)}
                      className="grid gap-3 md:grid-cols-[120px_180px_auto]"
                    >
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        {messages.tests.points}
                        <input
                          name="points"
                          type="number"
                          min="0"
                          defaultValue={item.points}
                          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        {messages.tests.timeLimitSeconds}
                        <input
                          name="timeLimitSeconds"
                          type="number"
                          min="1"
                          defaultValue={item.timeLimitSeconds ?? ""}
                          placeholder={messages.tests.noTimeLimit}
                          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={pending === item.id}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        >
                          {messages.tests.applyQuestionSettings}
                        </button>
                      </div>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
    </section>
  );
}
