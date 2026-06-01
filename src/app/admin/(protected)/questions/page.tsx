import Link from "next/link";

import { QuestionForm } from "@/components/question-form";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const questions = await prisma.question.findMany({
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
        <h1 className="text-3xl font-bold">{messages.questions.title}</h1>
        <p className="mt-2 text-slate-600">{messages.questions.description}</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.questions.newTitle}</h2>
        <QuestionForm />
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{messages.questions.bankTitle}</h2>
          <span className="text-sm text-slate-500">{messages.questions.filterPlaceholder}</span>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {questions.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.questions.empty}</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {questions.map((question) => (
                <article
                  key={question.id}
                  className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="line-clamp-1 font-semibold">{question.prompt}</h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {question.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {question.subject} - {messages.questions.fields.difficulty.toLowerCase()}{" "}
                      {question.difficulty} - {messages.questions.fields.options.toLowerCase()}{" "}
                      {question.options.length}
                    </p>
                  </div>
                  <Link
                    href={`/admin/questions/${question.id}`}
                    className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    {messages.common.edit}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
