import Link from "next/link";

import { ArchiveTestButton } from "@/components/archive-test-button";
import { TestForm } from "@/components/test-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTestsPage() {
  const tests = await prisma.test.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
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
        <h1 className="text-3xl font-bold">Тесты</h1>
        <p className="mt-2 text-slate-600">
          Создайте тест. При создании автоматически появится первая черновая версия.
        </p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Новый тест</h2>
        <TestForm />
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Список тестов</h2>
          <span className="text-sm text-slate-500">Дублирование теста будет добавлено позже.</span>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {tests.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">Пока нет тестов.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {tests.map((test) => {
                const latestVersion = test.versions[0];

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
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {test.subject} · {test.slug} · версия{" "}
                        {latestVersion?.versionNumber ?? 1} · вопросов{" "}
                        {latestVersion?._count.questions ?? 0}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/tests/${test.id}`}
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                      >
                        Редактировать
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
