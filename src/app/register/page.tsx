import { RegisterForm } from "@/components/register-form";
import { messages } from "@/lib/messages";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 grid gap-2">
          <h1 className="text-2xl font-bold">{messages.register.title}</h1>
          <p className="text-sm text-slate-600">{messages.register.subtitle}</p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}
