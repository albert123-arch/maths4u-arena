import Link from "next/link";

import { StudentRegisterForm } from "@/components/student-register-form";
import { messages } from "@/lib/messages";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

function safeNext(value?: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/student";
}

export default async function StudentRegisterPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const safeNextValue = safeNext(next);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.appName}
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-2">
            <h1 className="text-3xl font-bold">{messages.login.createStudentAccount}</h1>
            <p className="text-sm leading-6 text-slate-600">
              Students can create an account with a username and PIN. Teacher and admin accounts are created by an administrator.
            </p>
          </div>
          <StudentRegisterForm next={safeNextValue} />
          <Link
            href={`/login?next=${encodeURIComponent(safeNextValue)}`}
            className="mt-4 block text-sm font-semibold text-teal-800 hover:text-teal-950"
          >
            {messages.login.submit}
          </Link>
        </div>
      </section>
    </main>
  );
}
