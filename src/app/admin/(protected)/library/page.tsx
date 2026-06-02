import { AdminLibraryVisibilityButton } from "@/components/admin-library-actions";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function ownerName(owner: { name: string | null; email: string } | null) {
  return owner?.name ?? owner?.email ?? messages.results.hidden;
}

export default async function AdminLibraryPage() {
  const [tests, questions] = await Promise.all([
    prisma.test.findMany({
      where: {
        visibility: { in: ["PUBLIC", "CURATED"] },
        status: { not: "ARCHIVED" },
      },
      orderBy: [{ visibility: "asc" }, { sharedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        owner: { select: { name: true, email: true } },
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: { _count: { select: { questions: true } } },
        },
      },
    }),
    prisma.question.findMany({
      where: { visibility: { in: ["PUBLIC", "CURATED"] } },
      orderBy: [{ visibility: "asc" }, { sharedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        owner: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.adminLibrary.title}</h1>
        <p className="mt-2 text-slate-600">{messages.adminLibrary.description}</p>
      </div>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.adminLibrary.publicTests}</h2>
        {tests.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.adminLibrary.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {tests.map((test) => {
              const published = test.versions[0];

              return (
                <article key={test.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{test.title}</h3>
                      <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                        {test.visibility}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {test.subject} - {messages.adminLibrary.owner}: {ownerName(test.owner)} -{" "}
                      {published?._count.questions ?? 0} {messages.tests.questionCount}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminLibraryVisibilityButton
                      kind="tests"
                      id={test.id}
                      visibility="CURATED"
                      label={messages.adminLibrary.markCurated}
                    />
                    <AdminLibraryVisibilityButton
                      kind="tests"
                      id={test.id}
                      visibility="ARCHIVED"
                      label={messages.adminLibrary.archiveContent}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">{messages.adminLibrary.publicQuestions}</h2>
        {questions.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {messages.adminLibrary.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {questions.map((question) => (
              <article key={question.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="line-clamp-1 font-semibold">{question.prompt}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {question.type}
                    </span>
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
                      {question.visibility}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {question.subject} - {messages.adminLibrary.owner}: {ownerName(question.owner)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminLibraryVisibilityButton
                    kind="questions"
                    id={question.id}
                    visibility="CURATED"
                    label={messages.adminLibrary.markCurated}
                  />
                  <AdminLibraryVisibilityButton
                    kind="questions"
                    id={question.id}
                    visibility="ARCHIVED"
                    label={messages.adminLibrary.archiveContent}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
