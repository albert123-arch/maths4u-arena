import Link from "next/link";

import { StudentLoginForm } from "@/components/student-login-form";
import { messages } from "@/lib/messages";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function StudentLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.appName}
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-2">
            <h1 className="text-3xl font-bold">{messages.student.loginTitle}</h1>
            <p className="text-sm leading-6 text-slate-600">{messages.student.loginSubtitle}</p>
            {next ? (
              <p className="rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-900">
                {messages.student.loginRequired}
              </p>
            ) : null}
          </div>
          <StudentLoginForm next={next ?? "/student"} />
        </div>
      </section>
    </main>
  );
}
