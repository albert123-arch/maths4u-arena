import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/question-form";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherEditQuestionPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const question = await prisma.question.findFirst({
    where: { id, ownerUserId: teacher.id },
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
        <Link href="/teacher/questions" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.teacherShell.nav.questions}
        </Link>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <QuestionForm initial={question} mode="edit" apiBase="/api/teacher/questions" />
      </section>
    </div>
  );
}
