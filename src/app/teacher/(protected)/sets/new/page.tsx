import Link from "next/link";

import { QuizSetCreateForm } from "@/components/quiz-set-create-form";

export default function NewTeacherSetPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/teacher/sets" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          Back to quiz sets
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Create Quiz Set</h1>
        <p className="mt-2 text-slate-600">Start with a title, then add questions in the editor.</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <QuizSetCreateForm />
      </section>
    </div>
  );
}
