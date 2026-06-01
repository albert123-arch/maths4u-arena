import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cards = [
  {
    label: "Тесты",
    href: "/admin/tests",
    description: "Создание, публикация и архив тестов.",
    key: "tests",
  },
  {
    label: "Вопросы",
    href: "/admin/questions",
    description: "Банк заданий и правила проверки.",
    key: "questions",
  },
  {
    label: "Сессии",
    href: "#sessions",
    description: "Live-коды и игровые комнаты.",
    key: "sessions",
  },
  {
    label: "Результаты",
    href: "#results",
    description: "Ответы, баллы и события счета.",
    key: "results",
  },
];

export default async function AdminDashboardPage() {
  const [tests, questions, sessions, answers] = await Promise.all([
    prisma.test.count(),
    prisma.question.count(),
    prisma.gameSession.count(),
    prisma.answer.count(),
  ]);
  const counts: Record<string, number> = {
    tests,
    questions,
    sessions,
    results: answers,
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Панель управления</h1>
        <p className="mt-2 text-slate-600">
          Базовая структура для серьезной образовательной платформы уже разделена на тесты,
          вопросы, игровые сессии и результаты.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-md border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300"
          >
            <div className="text-3xl font-bold text-teal-800">{counts[card.key] ?? 0}</div>
            <h2 className="mt-3 text-lg font-semibold">{card.label}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
      <section className="rounded-md border border-dashed border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Дальше</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Дублирование тестов, фильтры, live host controls и расширенные режимы оставлены как
          подготовленные направления, без преждевременной реализации.
        </p>
      </section>
    </div>
  );
}
