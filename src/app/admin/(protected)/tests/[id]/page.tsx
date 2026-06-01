import Link from "next/link";
import { notFound } from "next/navigation";

import { TestForm } from "@/components/test-form";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTestPage({ params }: PageProps) {
  const { id } = await params;
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      },
    },
  });

  if (!test) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{messages.tests.editTitle}</h1>
          <p className="mt-2 text-slate-600">{messages.tests.editDescription}</p>
        </div>
        <Link href="/admin/tests" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
          {messages.tests.back}
        </Link>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <TestForm initial={test} mode="edit" />
      </section>
      <section className="rounded-md border border-dashed border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">{messages.tests.versionsTitle}</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          {test.versions.map((version) => (
            <p key={version.id}>
              {messages.tests.versionPrefix} {version.versionNumber}: {version.status},{" "}
              {messages.tests.questionCount}{" "}
              {version._count.questions}
            </p>
          ))}
          <p>{messages.tests.versionAttachPlaceholder}</p>
        </div>
      </section>
    </div>
  );
}
