import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteQuestionButton } from "@/components/delete-question-button";
import { QuestionForm } from "@/components/question-form";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditQuestionPage({ params }: PageProps) {
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!question) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.questions.editTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.questions.editDescription}</p>
        </div>
        <Link href="/admin/questions" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.questions.back}
        </Link>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <QuestionForm initial={question} mode="edit" />
      </section>
      <section className="rounded-md border border-red-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-red-900">{messages.questions.dangerTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">{messages.questions.dangerDescription}</p>
        <div className="mt-4">
          <DeleteQuestionButton id={question.id} />
        </div>
      </section>
    </div>
  );
}
