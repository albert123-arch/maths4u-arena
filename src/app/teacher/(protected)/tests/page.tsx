import Link from "next/link";

import { LaunchSessionModal } from "@/components/launch-session-modal";
import { TestForm } from "@/components/test-form";
import { ShareTeacherTestButton } from "@/components/teacher-library-actions";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherTestsPage() {
  const teacher = await requireTeacherUser();
  const [tests, classrooms] = await Promise.all([
    prisma.test.findMany({
      where: {
        ownerUserId: teacher.id,
        status: { not: "ARCHIVED" },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: {
              select: { questions: true },
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
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.myTests}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.teacherTestsDescription}</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.tests.newTitle}</h2>
        <TestForm apiBase="/api/teacher/tests" />
      </section>
      <section className="grid gap-3">
        {tests.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.tests.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {tests.map((test) => {
              const publishedVersion = test.versions[0];

              return (
                <article key={test.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{test.title}</h2>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {test.status}
                      </span>
                      <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                        {test.visibility}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {test.subject} - {messages.tests.versionPrefix.toLowerCase()}{" "}
                      {publishedVersion?.versionNumber ?? messages.tests.noPublishedVersion} -{" "}
                      {messages.tests.questionCount} {publishedVersion?._count.questions ?? 0}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publishedVersion ? (
                      <LaunchSessionModal
                        testTitle={test.title}
                        versionTitle={`${messages.tests.versionPrefix} ${publishedVersion.versionNumber}`}
                        testVersionId={publishedVersion.id}
                        questionCount={publishedVersion._count.questions}
                        apiPath="/api/teacher/sessions"
                        classrooms={classrooms}
                      />
                    ) : null}
                    <ShareTeacherTestButton id={test.id} />
                    <Link
                      href={`/teacher/tests/${test.id}`}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      {messages.common.edit}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
