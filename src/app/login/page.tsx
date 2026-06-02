import Link from "next/link";
import { redirect } from "next/navigation";

import { UnifiedLoginForm } from "@/components/unified-login-form";
import { getCurrentUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { getCurrentStudent } from "@/lib/student-auth";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

function safeNext(value?: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function dashboardForRole(role: "ADMIN" | "TEACHER" | "STUDENT") {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "TEACHER") {
    return "/teacher";
  }

  return "/student";
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const safeNextValue = safeNext(next);
  const [user, student] = await Promise.all([getCurrentUser(), getCurrentStudent()]);

  if (user) {
    redirect(safeNextValue ?? dashboardForRole(user.role));
  }

  if (student) {
    redirect(safeNextValue ?? dashboardForRole("STUDENT"));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.common.appName}
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-2">
            <h1 className="text-3xl font-bold">{messages.login.title}</h1>
            <p className="text-sm leading-6 text-slate-600">{messages.login.subtitle}</p>
          </div>
          <UnifiedLoginForm next={safeNextValue} />
        </div>
      </section>
    </main>
  );
}
