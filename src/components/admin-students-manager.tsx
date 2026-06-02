"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { STUDENT_STATUSES } from "@/lib/constants";
import { messages } from "@/lib/messages";

type StudentRow = {
  id: string;
  username: string;
  displayName: string;
  groupName: string | null;
  status: string;
  _count?: {
    registrations: number;
    participants: number;
  };
};

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function AdminStudentsManager({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/admin/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        displayName,
        groupName,
        password,
        status: "ACTIVE",
      }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setUsername("");
    setDisplayName("");
    setGroupName("");
    setPassword("");
    setMessage(messages.students.created);
    router.refresh();
  }

  async function updateStudent(id: string, data: Record<string, unknown>, successMessage: string) {
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/students/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = (await response.json()) as ApiResponse;

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage(successMessage);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{messages.students.newTitle}</h2>
          <span className="text-sm text-slate-500">{messages.students.bulkImportPlaceholder}</span>
        </div>
        <form onSubmit={createStudent} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.students.username}
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.students.displayName}
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.students.groupName}
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.students.password}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
          </div>
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          {message ? <p className="text-sm font-medium text-teal-700">{message}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-fit rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? messages.common.creating : messages.common.create}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold">{messages.students.listTitle}</h2>
        </div>
        {students.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.students.empty}</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {students.map((student) => (
              <article key={student.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{student.displayName}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {student.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {student.username}
                    {student.groupName ? ` - ${student.groupName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {student._count?.registrations ?? 0} {messages.series.registrations.toLowerCase()} -{" "}
                    {student._count?.participants ?? 0} {messages.host.participants.toLowerCase()}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[160px_auto_auto]">
                  <input
                    type="password"
                    value={resetPasswords[student.id] ?? ""}
                    onChange={(event) =>
                      setResetPasswords((current) => ({
                        ...current,
                        [student.id]: event.target.value,
                      }))
                    }
                    placeholder={messages.students.resetPassword}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateStudent(
                        student.id,
                        { password: resetPasswords[student.id] },
                        messages.students.updated,
                      )
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50"
                  >
                    {messages.students.resetPassword}
                  </button>
                  <select
                    value={student.status}
                    onChange={(event) =>
                      updateStudent(
                        student.id,
                        { status: event.target.value },
                        event.target.value === "DISABLED"
                          ? messages.students.disabled
                          : messages.students.updated,
                      )
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    {STUDENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
