"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { GRADING_TYPES, QUESTION_TYPES } from "@/lib/constants";
import { messages } from "@/lib/messages";

type QuestionOptionValue = {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
};

type QuestionFormValues = {
  id?: string;
  subject?: string;
  type?: string;
  prompt?: string;
  explanation?: string | null;
  difficulty?: number;
  gradingType?: string;
  gradingRulesJson?: string | null;
  options?: QuestionOptionValue[];
};

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

const trueFalseOptions = [
  { optionText: messages.questions.defaults.trueOption, isCorrect: true, sortOrder: 0 },
  { optionText: messages.questions.defaults.falseOption, isCorrect: false, sortOrder: 1 },
];

export function QuestionForm({
  initial,
  mode = "create",
  apiBase = "/api/admin/questions",
}: {
  initial?: QuestionFormValues;
  mode?: "create" | "edit";
  apiBase?: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initial?.subject ?? messages.questions.defaults.subject);
  const [type, setType] = useState(initial?.type ?? "MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [difficulty, setDifficulty] = useState(String(initial?.difficulty ?? 1));
  const [gradingType, setGradingType] = useState(initial?.gradingType ?? "EXACT");
  const [gradingRulesJson, setGradingRulesJson] = useState(initial?.gradingRulesJson ?? "");
  const [options, setOptions] = useState<QuestionOptionValue[]>(
    initial?.options?.length
      ? initial.options
      : [
          { optionText: "", isCorrect: true, sortOrder: 0 },
          { optionText: "", isCorrect: false, sortOrder: 1 },
        ],
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const usesOptions = type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE";
  const rulesPlaceholder = useMemo(() => {
    if (gradingType === "EXACT") {
      return messages.questions.placeholders.exact;
    }

    if (gradingType === "NUMERIC_TOLERANCE") {
      return messages.questions.placeholders.numericTolerance;
    }

    if (gradingType === "KEYWORDS") {
      return messages.questions.placeholders.keywords;
    }

    return messages.questions.placeholders.acceptedAnswers;
  }, [gradingType]);

  function changeType(nextType: string) {
    setType(nextType);

    if (nextType === "TRUE_FALSE") {
      setOptions(trueFalseOptions);
    } else if (nextType === "MULTIPLE_CHOICE" && options.length === 0) {
      setOptions([
        { optionText: "", isCorrect: true, sortOrder: 0 },
        { optionText: "", isCorrect: false, sortOrder: 1 },
      ]);
    }
  }

  function updateOption(index: number, patch: Partial<QuestionOptionValue>) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        optionText: "",
        isCorrect: false,
        sortOrder: current.length,
      },
    ]);
  }

  function removeOption(index: number) {
    setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const response = await fetch(
      mode === "edit" && initial?.id
        ? `${apiBase}/${initial.id}`
        : apiBase,
      {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          type,
          prompt,
          explanation,
          difficulty: Number(difficulty),
          gradingType,
          gradingRulesJson,
          options: usesOptions
            ? options.map((option, index) => ({
                ...option,
                sortOrder: index,
              }))
            : [],
        }),
      },
    );
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (mode === "create") {
      setPrompt("");
      setExplanation("");
      setGradingRulesJson("");
      setOptions([
        { optionText: "", isCorrect: true, sortOrder: 0 },
        { optionText: "", isCorrect: false, sortOrder: 1 },
      ]);
    }

    setMessage(mode === "create" ? messages.questions.created : messages.questions.updated);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.questions.fields.subject}
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.questions.fields.type}
          <select
            value={type}
            onChange={(event) => changeType(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            {QUESTION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.questions.fields.difficulty}
          <input
            type="number"
            min="1"
            max="10"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.questions.fields.prompt}
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.questions.fields.explanation}
        <textarea
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.questions.fields.grading}
          <select
            value={gradingType}
            onChange={(event) => setGradingType(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            {GRADING_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.questions.fields.gradingRules}
          <textarea
            value={gradingRulesJson}
            onChange={(event) => setGradingRulesJson(event.target.value)}
            placeholder={rulesPlaceholder}
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>
      {usesOptions ? (
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">
              {messages.questions.fields.options}
            </h3>
            {type === "MULTIPLE_CHOICE" ? (
              <button
                type="button"
                onClick={addOption}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-white"
              >
                {messages.questions.fields.add}
              </button>
            ) : null}
          </div>
          {options.map((option, index) => (
            <div key={`${option.id ?? "option"}-${index}`} className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <input
                value={option.optionText}
                onChange={(event) => updateOption(index, { optionText: event.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder={`${messages.questions.fields.optionPlaceholder} ${index + 1}`}
                required={usesOptions}
              />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={option.isCorrect}
                  onChange={(event) => updateOption(index, { isCorrect: event.target.checked })}
                />
                {messages.questions.fields.correct}
              </label>
              {type === "MULTIPLE_CHOICE" && options.length > 2 ? (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-white"
                >
                  {messages.questions.fields.remove}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending
          ? messages.common.saving
          : mode === "create"
            ? messages.questions.createButton
            : messages.common.save}
      </button>
    </form>
  );
}
