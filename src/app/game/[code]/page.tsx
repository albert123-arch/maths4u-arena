import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { code } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      testVersion: {
        include: {
          test: true,
          questions: {
            orderBy: { sortOrder: "asc" },
            include: {
              question: {
                include: {
                  options: {
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
        <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Игра не найдена</h1>
          <Link href="/play" className="font-semibold text-teal-800 hover:text-teal-950">
            Ввести другой код
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-4xl gap-6">
        <header className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-teal-800">Код: {session.code}</p>
          <h1 className="mt-2 text-3xl font-bold">{session.testVersion.test.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {session.mode} · {session.status} · участников {session._count.participants}
          </p>
        </header>
        {session.status === "LOBBY" ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-2xl font-bold">Ожидаем старт</h2>
            <p className="mt-2 text-slate-600">
              Учитель запустит игру, когда все участники будут готовы.
            </p>
          </section>
        ) : null}
        {session.status === "RUNNING" ? (
          <section className="grid gap-4">
            <h2 className="text-xl font-semibold">Классический тест</h2>
            {session.testVersion.questions.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
                В этой версии пока нет прикрепленных вопросов.
              </p>
            ) : (
              session.testVersion.questions.map((item, index) => (
                <article key={item.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">Вопрос {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold">{item.question.prompt}</h3>
                  <div className="mt-4 grid gap-2">
                    {item.question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        {option.optionText}
                      </button>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : null}
        {session.status === "PAUSED" || session.status === "FINISHED" ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-2xl font-bold">
              {session.status === "PAUSED" ? "Игра на паузе" : "Игра завершена"}
            </h2>
          </section>
        ) : null}
      </section>
    </main>
  );
}
