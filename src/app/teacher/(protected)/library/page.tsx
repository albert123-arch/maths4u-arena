import Link from "next/link";

import { CopyLibraryTestButton } from "@/components/teacher-library-actions";
import { requireTeacherUser } from "@/lib/auth";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string; subject?: string; difficulty?: string }>;
};

export default async function TeacherLibraryPage({ searchParams }: PageProps) {
  const teacher = await requireTeacherUser();
  const { q = "", subject = "", difficulty = "" } = await searchParams;
  const trimmedQuery = q.trim();
  const parsedDifficulty = Number.parseInt(difficulty, 10);
  const difficultyFilter = Number.isFinite(parsedDifficulty) ? parsedDifficulty : null;
  const libraryVisibility: Array<"PUBLIC" | "CURATED"> = ["PUBLIC", "CURATED"];
  const testWhere = {
    visibility: { in: libraryVisibility },
    status: { not: "ARCHIVED" as const },
    ...(subject ? { subject } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { title: { contains: trimmedQuery } },
            { subject: { contains: trimmedQuery } },
            { description: { contains: trimmedQuery } },
          ],
        }
      : {}),
  };
  const questionWhere = {
    visibility: { in: libraryVisibility },
    ...(subject ? { subject } : {}),
    ...(difficultyFilter ? { difficulty: difficultyFilter } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { prompt: { contains: trimmedQuery } },
            { subject: { contains: trimmedQuery } },
            { explanation: { contains: trimmedQuery } },
          ],
        }
      : {}),
  };
  const [tests, questions, testSubjects, questionSubjects] = await Promise.all([
    prisma.test.findMany({
      where: testWhere,
      orderBy: [{ visibility: "asc" }, { sharedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        owner: { select: { name: true, email: true } },
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: { select: { questions: true } },
            questions: {
              orderBy: { sortOrder: "asc" },
              take: 3,
              include: {
                question: {
                  select: {
                    id: true,
                    prompt: true,
                    type: true,
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
      where: questionWhere,
      orderBy: [{ visibility: "asc" }, { updatedAt: "desc" }],
      take: 40,
      include: {
        owner: { select: { name: true, email: true } },
      },
    }),
    prisma.test.findMany({
      where: {
        visibility: { in: libraryVisibility },
        status: { not: "ARCHIVED" },
      },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
      select: { subject: true },
    }),
    prisma.question.findMany({
      where: {
        visibility: { in: libraryVisibility },
      },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
      select: { subject: true },
    }),
  ]);
  const subjects = Array.from(
    new Set([...testSubjects, ...questionSubjects].map((item) => item.subject).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.teacher.libraryTitle}</h1>
        <p className="mt-2 text-slate-600">{messages.teacher.libraryDescription}</p>
      </div>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.teacher.librarySearch}
          <input
            name="q"
            defaultValue={q}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.teacher.librarySubject}
          <select
            name="subject"
            defaultValue={subject}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">{messages.teacher.allSubjects}</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          {messages.teacher.libraryDifficulty}
          <select
            name="difficulty"
            defaultValue={difficulty}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">{messages.teacher.allDifficulties}</option>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800">
            {messages.common.search}
          </button>
        </div>
      </form>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.tests.title}</h2>
        {tests.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noLibraryContent}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {tests.map((test) => {
              const published = test.versions[0];
              const isOwnSet = test.ownerUserId === teacher.id;

              return (
                <article key={test.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{test.title}</h2>
                      <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                        {test.visibility}
                      </span>
                      {isOwnSet ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          Your shared set
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {test.subject} - {isOwnSet
                        ? "You"
                        : test.owner?.name ?? test.owner?.email ?? "Maths4U Arena"} -{" "}
                      {published?._count.questions ?? 0} {messages.tests.questionCount}
                    </p>
                    {test.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{test.description}</p>
                    ) : null}
                    {published?.questions.length ? (
                      <div className="mt-3 rounded-md bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          {messages.teacher.preview}
                        </p>
                        <div className="mt-2 grid gap-1">
                          {published.questions.map((item) => (
                            <p key={item.question.id} className="line-clamp-1 text-sm text-slate-700">
                              {item.question.type} - {item.question.prompt}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {isOwnSet ? (
                      <Link
                        href={`/teacher/sets/${test.id}/edit`}
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Edit
                      </Link>
                    ) : published ? (
                      <CopyLibraryTestButton id={test.id} />
                    ) : (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                        Publish required
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.questions.title}</h2>
        {questions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.teacher.noLibraryContent}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {questions.map((question) => (
              <article key={question.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="line-clamp-1 font-semibold">{question.prompt}</h3>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {question.type}
                  </span>
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                    {question.visibility}
                  </span>
                  {question.ownerUserId === teacher.id ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      Your shared question
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {question.subject} - {messages.questions.fields.difficulty.toLowerCase()}{" "}
                  {question.difficulty} - {question.ownerUserId === teacher.id
                    ? "You"
                    : question.owner?.name ?? question.owner?.email ?? "Maths4U Arena"}
                </p>
                {question.explanation ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {messages.teacher.preview}: {question.explanation}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">{messages.teacher.noPreview}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
