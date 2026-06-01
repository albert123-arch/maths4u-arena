"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { TEST_STATUSES } from "@/lib/constants";

type TestFormValues = {
  id?: string;
  title?: string;
  slug?: string;
  subject?: string;
  description?: string | null;
  locale?: string;
  status?: string;
};

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function TestForm({
  initial,
  mode = "create",
}: {
  initial?: TestFormValues;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [locale, setLocale] = useState(initial?.locale ?? "ru");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const response = await fetch(
      mode === "edit" && initial?.id ? `/api/admin/tests/${initial.id}` : "/api/admin/tests",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          subject,
          description,
          locale,
          status,
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
      setTitle("");
      setSlug("");
      setSubject("");
      setDescription("");
      setStatus("DRAFT");
    }

    setMessage(mode === "create" ? "Тест создан." : "Тест обновлен.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Название
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Slug
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            placeholder="avto-iz-nazvaniya"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Предмет
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Язык
          <input
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Статус
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            {TEST_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Описание
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Сохранение..." : mode === "create" ? "Создать тест" : "Сохранить"}
      </button>
    </form>
  );
}
