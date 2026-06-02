import Link from "next/link";

import { QuestionForm } from "@/components/question-form";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherQuestionsPage() {
  const teacher = await requireTeacherUser();
  const questions = await prisma.question.findMany({
    where: {
      ownerUserId: teacher.id,
      visibility: { not: "ARCHIVED" },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.myQuestions}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.teacherQuestionsDescription}</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.questions.newTitle}</h2>
        <QuestionForm apiBase="/api/teacher/questions" />
      </section>
      <section className="grid gap-3">
        {questions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.questions.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {questions.map((question) => (
              <article key={question.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="line-clamp-1 font-semibold">{question.prompt}</h2>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {question.type}
                    </span>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {question.visibility}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {question.subject} - {messages.questions.fields.difficulty.toLowerCase()}{" "}
                    {question.difficulty} - {messages.questions.fields.options.toLowerCase()}{" "}
                    {question.options.length}
                  </p>
                </div>
                <Link
                  href={`/teacher/questions/${question.id}`}
                  className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  {messages.common.edit}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
