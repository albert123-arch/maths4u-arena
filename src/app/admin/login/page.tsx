import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();

  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 grid gap-2">
          <h1 className="text-2xl font-bold">Вход администратора</h1>
          <p className="text-sm text-slate-600">Управление тестами, вопросами и игровыми сессиями.</p>
        </div>
        <AdminLoginForm />
      </section>
    </main>
  );
}
