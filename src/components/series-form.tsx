"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { SERIES_STATUSES } from "@/lib/constants";
import { messages } from "@/lib/messages";

type SeriesFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  status?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  settingsJson?: string | null;
};

type ApiResponse =
  | {
      ok: true;
      data: {
        id: string;
      };
    }
  | { ok: false; error: string };

function datetimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

export function SeriesForm({
  initial,
  mode = "create",
}: {
  initial?: SeriesFormValues;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [startsAt, setStartsAt] = useState(datetimeInput(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(datetimeInput(initial?.endsAt));
  const [settingsJson, setSettingsJson] = useState(initial?.settingsJson ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    const response = await fetch(
      mode === "edit" && initial?.id ? `/api/admin/series/${initial.id}` : "/api/admin/series",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          status,
          startsAt,
          endsAt,
          settingsJson,
        }),
      },
    );
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage(mode === "create" ? messages.series.created : messages.series.updated);

    if (mode === "create") {
      router.push(`/admin/series/${result.data.id}`);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.series.titleField}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.series.status}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          >
            {SERIES_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.series.startsAt}
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.series.endsAt}
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.series.descriptionField}
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        {messages.series.settingsJson}
        <textarea
          value={settingsJson}
          onChange={(event) => setSettingsJson(event.target.value)}
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          placeholder='{ "publicLeaderboard": true }'
        />
      </label>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? messages.common.saving : mode === "create" ? messages.series.createButton : messages.common.save}
      </button>
    </form>
  );
}
