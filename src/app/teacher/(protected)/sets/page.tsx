import Link from "next/link";

import { AssignHomeworkModal } from "@/components/assign-homework-modal";
import { LaunchSessionModal } from "@/components/launch-session-modal";
import { PublishQuizSetButton } from "@/components/publish-quiz-set-button";
import { QuizSetActions } from "@/components/quiz-set-actions";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ classId?: string }>;
};

export default async function TeacherSetsPage({ searchParams }: PageProps) {
  const { classId = "" } = await searchParams;
  const teacher = await requireTeacherUser();
  const [sets, classrooms] = await Promise.all([
    prisma.test.findMany({
      where: {
        ownerUserId: teacher.id,
        status: { not: "ARCHIVED" },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
    }),
    prisma.classroom.findMany({
      where: { teacherId: teacher.id, status: "ACTIVE" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  const defaultClassId = classrooms.some((classroom) => classroom.id === classId) ? classId : "";
  const defaultClass = classrooms.find((classroom) => classroom.id === defaultClassId) ?? null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Quiz Sets</h1>
          <p className="mt-2 text-slate-600">Create, edit, host, assign, and share quiz sets.</p>
        </div>
        <Link
          href="/teacher/sets/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Create Quiz Set
        </Link>
      </div>
      {defaultClass ? (
        <section className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <p className="font-semibold">{messages.teacher.hostingForClass}</p>
          <p className="mt-1">
            {messages.teacher.hostingForClassHelp} <span className="font-semibold">{defaultClass.title}</span>.
          </p>
        </section>
      ) : null}
      {sets.length === 0 ? (
        <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold">Create your first quiz set</h2>
          <p className="mt-2 text-slate-600">Add questions in one place, then host live or assign homework.</p>
          <Link
            href="/teacher/sets/new"
            className="mt-4 inline-flex rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
          >
            Create Quiz Set
          </Link>
        </section>
      ) : (
        <section className="grid gap-4">
          {sets.map((set) => {
            const publishedVersion = set.versions.find((version) => version.status === "PUBLISHED") ?? null;
            const draftVersion = set.versions.find((version) => version.status === "DRAFT") ?? null;
            const latestVersion = publishedVersion ?? draftVersion ?? set.versions[0] ?? null;
            const questionCount = latestVersion?._count.questions ?? 0;

            return (
              <article key={set.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{set.title}</h2>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {set.visibility === "PUBLIC" ? "Shared" : "Private"}
                      </span>
                    </div>
                    {set.description ? <p className="mt-2 text-sm text-slate-600">{set.description}</p> : null}
                    <p className="mt-2 text-sm text-slate-600">
                      {set.subject} - {questionCount} questions - Updated {set.updatedAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      href={`/teacher/sets/${set.id}/edit`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/teacher/sets/${set.id}/edit#preview`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Preview
                    </Link>
                    {publishedVersion ? (
                      <>
                        <LaunchSessionModal
                          testTitle={set.title}
                          versionTitle="Published Quiz Set"
                          testVersionId={publishedVersion.id}
                          questionCount={publishedVersion._count.questions}
                          apiPath="/api/teacher/sessions"
                          classrooms={classrooms}
                          defaultClassId={defaultClassId}
                        />
                        <AssignHomeworkModal
                          quizSetId={set.id}
                          quizSetTitle={set.title}
                          testVersionId={publishedVersion.id}
                          classrooms={classrooms}
                        />
                      </>
                    ) : draftVersion ? (
                      <PublishQuizSetButton draftVersionId={draftVersion.id} />
                    ) : null}
                    <QuizSetActions id={set.id} visibility={set.visibility} compact />
                  </div>
                </div>
                {!publishedVersion && draftVersion ? (
                  <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                    Publish this set before hosting live or assigning homework.
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
      <Link href="/teacher/tests" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
        Advanced Test Manager
      </Link>
    </div>
  );
}
