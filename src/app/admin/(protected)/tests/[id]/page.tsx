import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminLibraryVisibilityButton } from "@/components/admin-library-actions";
import { TestForm } from "@/components/test-form";
import { TestVersionEditor } from "@/components/test-version-editor";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTestPage({ params }: PageProps) {
  const { id } = await params;
  const [test, questionBank] = await Promise.all([
    prisma.test.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            _count: {
              select: { questions: true },
            },
            questions: {
              orderBy: { sortOrder: "asc" },
              include: {
                question: {
                  select: {
                    id: true,
                    prompt: true,
                    type: true,
                    subject: true,
                    difficulty: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.question.findMany({
      orderBy: [{ subject: "asc" }, { difficulty: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        prompt: true,
        type: true,
        subject: true,
        difficulty: true,
      },
    }),
  ]);

  if (!test) {
    notFound();
  }

  const draftVersion = test.versions.find((version) => version.status === "DRAFT") ?? null;
  const isShared = test.visibility === "PUBLIC" || test.visibility === "CURATED";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{messages.tests.editTitle}</h1>
            <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
              {isShared ? "Shared" : "Private"}
            </span>
          </div>
          <p className="mt-2 text-slate-600">{messages.tests.editDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminLibraryVisibilityButton
            kind="tests"
            id={test.id}
            visibility={isShared ? "PRIVATE" : "PUBLIC"}
            label={isShared ? "Unshare" : "Share"}
          />
          <Link href="/admin/tests" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {messages.tests.back}
          </Link>
        </div>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <TestForm initial={test} mode="edit" />
      </section>
      <TestVersionEditor
        key={draftVersion?.id ?? "no-draft-version"}
        testTitle={test.title}
        testId={test.id}
        versions={test.versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          title: version.title,
          status: version.status,
          publishedAt: version.publishedAt?.toISOString() ?? null,
          _count: version._count,
        }))}
        draftVersion={
          draftVersion
            ? {
                id: draftVersion.id,
                versionNumber: draftVersion.versionNumber,
                title: draftVersion.title,
                instructions: draftVersion.instructions,
                settingsJson: draftVersion.settingsJson,
                status: draftVersion.status,
                questions: draftVersion.questions.map((item) => ({
                  id: item.id,
                  questionId: item.questionId,
                  sortOrder: item.sortOrder,
                  points: item.points,
                  timeLimitSeconds: item.timeLimitSeconds,
                  question: item.question,
                })),
              }
            : null
        }
        questionBank={questionBank}
      />
    </div>
  );
}
