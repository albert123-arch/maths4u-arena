import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignHomeworkModal } from "@/components/assign-homework-modal";
import { LaunchSessionModal } from "@/components/launch-session-modal";
import { PublishQuizSetButton } from "@/components/publish-quiz-set-button";
import { QuizSetActions } from "@/components/quiz-set-actions";
import { QuizSetEditor } from "@/components/quiz-set-editor";
import { requireTeacherUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDraftVersion } from "@/lib/quiz-sets";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type BuilderType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_TEXT" | "NUMERIC";

function supportedType(type: string): BuilderType {
  return type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE" || type === "SHORT_TEXT" || type === "NUMERIC"
    ? type
    : "SHORT_TEXT";
}

export default async function TeacherSetEditorPage({ params }: PageProps) {
  const teacher = await requireTeacherUser();
  const { id } = await params;
  const test = await prisma.test.findFirst({
    where: {
      id,
      ownerUserId: teacher.id,
      status: { not: "ARCHIVED" },
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (!test) {
    notFound();
  }

  const draft = await ensureDraftVersion(test.id, teacher.id);
  const [draftWithQuestions, classrooms, publishedVersion] = await Promise.all([
    prisma.testVersion.findUnique({
      where: { id: draft.id },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    optionText: true,
                    isCorrect: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.classroom.findMany({
      where: { teacherId: teacher.id, status: "ACTIVE" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.testVersion.findFirst({
      where: { testId: test.id, status: "PUBLISHED" },
      orderBy: { versionNumber: "desc" },
      include: { _count: { select: { questions: true } } },
    }),
  ]);

  if (!draftWithQuestions) {
    notFound();
  }

  const editorQuestions = draftWithQuestions.questions.map((item) => ({
    id: item.id,
    questionId: item.questionId,
    prompt: item.question.prompt,
    type: supportedType(item.question.type),
    explanation: item.question.explanation ?? "",
    points: item.points,
    timeLimitSeconds: item.timeLimitSeconds,
    options: item.question.options,
    gradingRulesJson: item.question.gradingRulesJson,
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/teacher/sets" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            Back to quiz sets
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">Edit Quiz Set</h1>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {test.visibility === "PUBLIC" ? "Shared" : "Private"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {publishedVersion ? (
            <>
              <LaunchSessionModal
                testTitle={test.title}
                versionTitle="Published Quiz Set"
                testVersionId={publishedVersion.id}
                questionCount={publishedVersion._count.questions}
                apiPath="/api/teacher/sessions"
                classrooms={classrooms}
              />
              <AssignHomeworkModal
                quizSetId={test.id}
                quizSetTitle={test.title}
                testVersionId={publishedVersion.id}
                classrooms={classrooms}
              />
            </>
          ) : (
            <PublishQuizSetButton draftVersionId={draft.id} />
          )}
          <QuizSetActions id={test.id} visibility={test.visibility} compact />
        </div>
      </div>

      {!publishedVersion ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Publish this set before hosting live or assigning homework.
        </p>
      ) : null}

      <QuizSetEditor
        quizSet={{
          id: test.id,
          title: test.title,
          description: test.description ?? "",
          subject: test.subject,
          visibility: test.visibility,
        }}
        questions={editorQuestions}
      />
    </div>
  );
}
