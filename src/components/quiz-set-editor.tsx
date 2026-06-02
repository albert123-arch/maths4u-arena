"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { messages } from "@/lib/messages";

type BuilderType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_TEXT" | "NUMERIC";

type EditorQuestion = {
  id: string;
  questionId: string;
  prompt: string;
  type: BuilderType;
  explanation: string;
  points: number;
  timeLimitSeconds: number | null;
  options: Array<{ id: string; optionText: string; isCorrect: boolean }>;
  gradingRulesJson: string | null;
};

type ApiResponse = { ok: true; data: unknown } | { ok: false; error: string };

type QuestionDraft = {
  prompt: string;
  type: BuilderType;
  explanation: string;
  points: number;
  timeLimitSeconds: string;
  options: string[];
  correctOptionIndex: number;
  correctBoolean: boolean;
  acceptedAnswers: string;
  caseSensitive: boolean;
  correctNumber: string;
  tolerance: string;
};

const blankDraft: QuestionDraft = {
  prompt: "",
  type: "MULTIPLE_CHOICE",
  explanation: "",
  points: 1,
  timeLimitSeconds: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  correctBoolean: true,
  acceptedAnswers: "",
  caseSensitive: false,
  correctNumber: "",
  tolerance: "0",
};

function parseRules(json: string | null) {
  try {
    return json ? (JSON.parse(json) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function draftFromQuestion(question: EditorQuestion): QuestionDraft {
  const rules = parseRules(question.gradingRulesJson);

  return {
    prompt: question.prompt,
    type: question.type,
    explanation: question.explanation,
    points: question.points,
    timeLimitSeconds: question.timeLimitSeconds ? String(question.timeLimitSeconds) : "",
    options:
      question.options.length > 0
        ? question.options.map((option) => option.optionText)
        : ["", "", "", ""],
    correctOptionIndex: Math.max(
      question.options.findIndex((option) => option.isCorrect),
      0,
    ),
    correctBoolean: String(rules.answer ?? "True").toLowerCase() !== "false",
    acceptedAnswers: Array.isArray(rules.answers) ? rules.answers.join(", ") : String(rules.answer ?? ""),
    caseSensitive: rules.caseSensitive === true,
    correctNumber: String(rules.answer ?? ""),
    tolerance: String(rules.tolerance ?? 0),
  };
}

function payloadFromDraft(draft: QuestionDraft) {
  return {
    prompt: draft.prompt,
    type: draft.type,
    explanation: draft.explanation,
    points: draft.points,
    timeLimitSeconds: draft.timeLimitSeconds ? Number(draft.timeLimitSeconds) : null,
    options: draft.options,
    correctOptionIndex: draft.correctOptionIndex,
    correctBoolean: draft.correctBoolean,
    acceptedAnswers: draft.acceptedAnswers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    caseSensitive: draft.caseSensitive,
    correctNumber: draft.correctNumber ? Number(draft.correctNumber) : 0,
    tolerance: draft.tolerance ? Number(draft.tolerance) : 0,
  };
}

function parsePaste(text: string): QuestionDraft[] {
  const blocks = text
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const drafts = blocks.map((block): QuestionDraft | null => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const questionLine = lines.find((line) => /^Q:/i.test(line));

    if (!questionLine) {
      return null;
    }

    const optionLines = lines.filter((line) => /^[A-D]\)/i.test(line));
    const answerLine = lines.find((line) => /^Answer:/i.test(line));

    if (optionLines.length > 0) {
      const options = optionLines.map((line) => line.replace(/^[A-D]\)\s*/i, "").replace(/\s*\*$/, ""));
      const correctOptionIndex = Math.max(optionLines.findIndex((line) => /\*$/.test(line)), 0);

      return {
        ...blankDraft,
        prompt: questionLine.replace(/^Q:\s*/i, ""),
        type: "MULTIPLE_CHOICE" as const,
        options,
        correctOptionIndex,
      };
    }

    return {
      ...blankDraft,
      prompt: questionLine.replace(/^Q:\s*/i, ""),
      type: "SHORT_TEXT" as const,
      acceptedAnswers: answerLine?.replace(/^Answer:\s*/i, "") ?? "",
    };
  });

  return drafts.filter((item): item is QuestionDraft => Boolean(item));
}

export function QuizSetEditor({
  quizSet,
  questions,
}: {
  quizSet: {
    id: string;
    title: string;
    description: string;
    subject: string;
    visibility: string;
  };
  questions: EditorQuestion[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(quizSet.title);
  const [description, setDescription] = useState(quizSet.description);
  const [subject, setSubject] = useState(quizSet.subject);
  const [visibility, setVisibility] = useState(quizSet.visibility);
  const [newDraft, setNewDraft] = useState<QuestionDraft>(blankDraft);
  const [editing, setEditing] = useState<Record<string, QuestionDraft>>({});
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<QuestionDraft[]>([]);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sortedQuestions = useMemo(() => questions, [questions]);

  async function saveSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await request(`/api/teacher/sets/${quizSet.id}`, "PATCH", {
      title,
      description,
      subject,
      visibility,
    });
  }

  async function request(path: string, method: string, body?: unknown) {
    setPending(path);
    setError("");
    setMessage("");

    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as ApiResponse;

      if (!result.ok) {
        setError(result.error);
        return false;
      }

      setMessage("Saved.");
      router.refresh();
      return true;
    } catch {
      setError(messages.api.unknownError);
      return false;
    } finally {
      setPending("");
    }
  }

  async function addQuestion() {
    const ok = await request(`/api/teacher/sets/${quizSet.id}/questions`, "POST", payloadFromDraft(newDraft));

    if (ok) {
      setNewDraft(blankDraft);
    }
  }

  async function importQuestions() {
    const ok = await request(`/api/teacher/sets/${quizSet.id}/questions`, "POST", {
      questions: parsed.map(payloadFromDraft),
    });

    if (ok) {
      setPasteText("");
      setParsed([]);
    }
  }

  function updateDraft(current: QuestionDraft, patch: Partial<QuestionDraft>) {
    return { ...current, ...patch };
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={saveSet} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
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
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              required
            />
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
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Visibility
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Shared</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={Boolean(pending)}
            className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? messages.common.saving : messages.common.save}
          </button>
        </div>
      </form>

      <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Add Question</h2>
          <p className="mt-1 text-sm text-slate-600">Build questions directly inside this quiz set.</p>
        </div>
        <QuestionDraftFields draft={newDraft} onChange={(patch) => setNewDraft(updateDraft(newDraft, patch))} />
        <button
          type="button"
          onClick={addQuestion}
          disabled={Boolean(pending)}
          className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add Question"}
        </button>
      </section>

      <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Paste Questions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Example: Q: What is 2+2? then A) 3, B) 4 * or Answer: Paris.
          </p>
        </div>
        <textarea
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
          className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          placeholder={"Q: What is 2+2?\nA) 3\nB) 4 *\nC) 5\nD) 6\n\nQ: Capital of France?\nAnswer: Paris"}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParsed(parsePaste(pasteText))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Parse Preview
          </button>
          {parsed.length > 0 ? (
            <button
              type="button"
              onClick={importQuestions}
              disabled={Boolean(pending)}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              Import {parsed.length} Questions
            </button>
          ) : null}
        </div>
        {parsed.length > 0 ? (
          <div className="grid gap-2">
            {parsed.map((item, index) => (
              <p key={`${item.prompt}-${index}`} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                {index + 1}. {item.prompt} ({item.type.replace("_", " ")})
              </p>
            ))}
          </div>
        ) : null}
      </section>

      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Questions</h2>
        {sortedQuestions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No questions yet. Add your first question above.
          </p>
        ) : (
          sortedQuestions.map((question, index) => {
            const draft = editing[question.id] ?? draftFromQuestion(question);

            return (
              <article key={question.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Question {index + 1} - {question.points} points
                    </p>
                    <h3 className="mt-1 font-semibold">{question.prompt}</h3>
                    <p className="mt-1 text-sm text-slate-600">{question.type.replace("_", " ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => request(`/api/teacher/sets/${quizSet.id}/questions/${question.id}`, "PATCH", { action: "MOVE_UP" })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => request(`/api/teacher/sets/${quizSet.id}/questions/${question.id}`, "PATCH", { action: "MOVE_DOWN" })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => request(`/api/teacher/sets/${quizSet.id}/questions/${question.id}`, "PATCH", { action: "DUPLICATE" })}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => request(`/api/teacher/sets/${quizSet.id}/questions/${question.id}`, "PATCH", { action: "DELETE" })}
                      className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-teal-800">Edit question</summary>
                  <div className="mt-4 grid gap-4">
                    <QuestionDraftFields
                      draft={draft}
                      onChange={(patch) =>
                        setEditing((current) => ({
                          ...current,
                          [question.id]: updateDraft(draft, patch),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        request(`/api/teacher/sets/${quizSet.id}/questions/${question.id}`, "PATCH", {
                          action: "UPDATE",
                          ...payloadFromDraft(draft),
                        })
                      }
                      disabled={Boolean(pending)}
                      className="w-fit rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                    >
                      Save question
                    </button>
                  </div>
                </details>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function QuestionDraftFields({
  draft,
  onChange,
}: {
  draft: QuestionDraft;
  onChange: (patch: Partial<QuestionDraft>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Question text
          <textarea
            value={draft.prompt}
            onChange={(event) => onChange({ prompt: event.target.value })}
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Question type
          <select
            value={draft.type}
            onChange={(event) => onChange({ type: event.target.value as BuilderType })}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_TEXT">Short Answer</option>
            <option value="NUMERIC">Number</option>
          </select>
        </label>
      </div>
      {draft.type === "MULTIPLE_CHOICE" ? (
        <div className="grid gap-2">
          {draft.options.map((option, index) => (
            <label key={index} className="grid gap-1 text-sm font-medium text-slate-700">
              Option {String.fromCharCode(65 + index)}
              <div className="flex gap-2">
                <input
                  value={option}
                  onChange={(event) =>
                    onChange({
                      options: draft.options.map((item, optionIndex) =>
                        optionIndex === index ? event.target.value : item,
                      ),
                    })
                  }
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
                  <input
                    type="radio"
                    name={`correct-${draft.prompt}`}
                    checked={draft.correctOptionIndex === index}
                    onChange={() => onChange({ correctOptionIndex: index })}
                  />
                  Correct
                </label>
              </div>
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange({ options: [...draft.options, ""] })}
            className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Add option
          </button>
        </div>
      ) : null}
      {draft.type === "TRUE_FALSE" ? (
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Correct answer
          <select
            value={draft.correctBoolean ? "true" : "false"}
            onChange={(event) => onChange({ correctBoolean: event.target.value === "true" })}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
      ) : null}
      {draft.type === "SHORT_TEXT" ? (
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Accepted answers
            <input
              value={draft.acceptedAnswers}
              onChange={(event) => onChange({ acceptedAnswers: event.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              placeholder="Separate answers with commas"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={draft.caseSensitive}
              onChange={(event) => onChange({ caseSensitive: event.target.checked })}
              className="h-4 w-4 accent-teal-700"
            />
            Case sensitive
          </label>
        </div>
      ) : null}
      {draft.type === "NUMERIC" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Correct number
            <input
              type="number"
              value={draft.correctNumber}
              onChange={(event) => onChange({ correctNumber: event.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Tolerance
            <input
              type="number"
              min="0"
              value={draft.tolerance}
              onChange={(event) => onChange({ tolerance: event.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Points
          <input
            type="number"
            min="0"
            value={draft.points}
            onChange={(event) => onChange({ points: Number(event.target.value) })}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Time limit seconds
          <input
            type="number"
            min="1"
            value={draft.timeLimitSeconds}
            onChange={(event) => onChange({ timeLimitSeconds: event.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Explanation
        <textarea
          value={draft.explanation}
          onChange={(event) => onChange({ explanation: event.target.value })}
          className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>
    </div>
  );
}
