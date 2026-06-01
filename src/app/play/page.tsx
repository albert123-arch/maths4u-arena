import Link from "next/link";

import { PlayJoinForm } from "@/components/play-join-form";

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <Link href="/" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          Maths4U Arena
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 grid gap-2">
            <h1 className="text-3xl font-bold">Войти в игру</h1>
            <p className="text-sm leading-6 text-slate-600">
              Введите код, который показывает учитель или ведущий, и свое имя.
            </p>
          </div>
          <PlayJoinForm />
        </div>
      </section>
    </main>
  );
}
