"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { messages } from "@/lib/messages";

type TeacherRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date | string;
  _count: {
    classrooms: number;
    ownedTests: number;
    questions: number;
  };
};

type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function AdminTeachersManager({ teachers }: { teachers: TeacherRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  async function createTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    const result = (await response.json()) as ApiResponse;
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEmail("");
    setName("");
    setPassword("");
    setMessage(messages.adminTeachers.teacherCreated);
    router.refresh();
  }

  async function resetPassword(id: string) {
    setResettingId(id);
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPasswords[id] ?? "" }),
    });
    const result = (await response.json()) as ApiResponse;
    setResettingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setResetPasswords((current) => ({ ...current, [id]: "" }));
    setMessage(messages.adminTeachers.passwordReset);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{messages.adminTeachers.newTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{messages.adminTeachers.disableTodo}</p>
        </div>
        <form onSubmit={createTeacher} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.adminTeachers.email}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.adminTeachers.name}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              {messages.adminTeachers.password}
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
            {pending ? messages.common.creating : messages.adminTeachers.createTeacher}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold">{messages.adminTeachers.listTitle}</h2>
        </div>
        {teachers.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">{messages.adminTeachers.empty}</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {teachers.map((teacher) => (
              <article key={teacher.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h3 className="font-semibold">{teacher.name ?? teacher.email}</h3>
                  <p className="mt-1 text-sm text-slate-600">{teacher.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {teacher._count.classrooms} {messages.adminTeachers.classes.toLowerCase()} -{" "}
                    {teacher._count.ownedTests} {messages.adminTeachers.tests.toLowerCase()} -{" "}
                    {teacher._count.questions} {messages.adminTeachers.questions.toLowerCase()}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[190px_auto]">
                  <input
                    type="password"
                    value={resetPasswords[teacher.id] ?? ""}
                    onChange={(event) =>
                      setResetPasswords((current) => ({
                        ...current,
                        [teacher.id]: event.target.value,
                      }))
                    }
                    placeholder={messages.adminTeachers.resetPassword}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => resetPassword(teacher.id)}
                    disabled={resettingId === teacher.id}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {resettingId === teacher.id
                      ? messages.common.saving
                      : messages.adminTeachers.resetPassword}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
