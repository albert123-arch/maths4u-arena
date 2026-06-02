import Link from "next/link";

import { AdminLibraryVisibilityButton } from "@/components/admin-library-actions";
import { ArchiveTestButton } from "@/components/archive-test-button";
import { LaunchSessionModal } from "@/components/launch-session-modal";
import { TestForm } from "@/components/test-form";
import { messages } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTestsPage() {
  const tests = await prisma.test.findMany({
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
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.tests.title}</h1>
        <p className="mt-2 text-slate-600">{messages.tests.description}</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">{messages.tests.newTitle}</h2>
        <TestForm />
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{messages.tests.listTitle}</h2>
          <span className="text-sm text-slate-500">{messages.tests.duplicatePlaceholder}</span>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {tests.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">{messages.tests.empty}</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {tests.map((test) => {
                const publishedVersion = test.versions[0];
                const isShared = test.visibility === "PUBLIC" || test.visibility === "CURATED";

                return (
                  <article
                    key={test.id}
                    className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{test.title}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {test.status}
                        </span>
                        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
                          {test.visibility === "PUBLIC" || test.visibility === "CURATED"
                            ? "Shared"
                            : "Private"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {test.subject} - {test.slug} - {messages.tests.versionPrefix.toLowerCase()}{" "}
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
                        />
                      ) : null}
                      <AdminLibraryVisibilityButton
                        kind="tests"
                        id={test.id}
                        visibility={isShared ? "PRIVATE" : "PUBLIC"}
                        label={isShared ? "Unshare" : "Share"}
                      />
                      <Link
                        href={`/admin/tests/${test.id}`}
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                      >
                        {messages.common.edit}
                      </Link>
                      <ArchiveTestButton id={test.id} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
