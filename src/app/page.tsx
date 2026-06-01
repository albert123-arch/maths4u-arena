import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="grid gap-6">
          <p className="w-fit rounded-md bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-900">
            Образовательная арена для математики
          </p>
          <div className="grid gap-4">
            <h1 className="text-4xl font-bold leading-tight sm:text-6xl">Maths4U Arena</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              Платформа для тестов, тренировок и будущих игровых режимов в стиле live quiz:
              классические задания, соревнования, командные игры и математическая карусель.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/play"
              className="rounded-md bg-teal-700 px-5 py-3 text-center font-semibold text-white hover:bg-teal-800"
            >
              Ввести код и играть
            </Link>
            <Link
              href="/admin/login"
              className="rounded-md border border-slate-300 px-5 py-3 text-center font-semibold text-slate-800 hover:bg-white"
            >
              Вход для администратора
            </Link>
          </div>
        </div>
        <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">MVP foundation</h2>
          <div className="grid gap-3 text-sm text-slate-700">
            <p>Сейчас доступны базовые тесты, вопросы, сессии и скелет прохождения.</p>
            <p>Архитектура готовится для будущих режимов: host-paced, team, practice и carousel.</p>
            <p>Следующий шаг: импорт реальных летних тестов и наполнение банка вопросов.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
