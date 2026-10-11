"use client";
import Link from "next/link";
import type { courseCatalog } from "@/lib/catalog";
import { Empty, ErrorNotice, Loading, useLocale, useResource } from "./ui";

export function MyCourses() {
  const { t } = useLocale(), r = useResource<Awaited<ReturnType<typeof courseCatalog>>>("catalog/courses");
  const selected = r.data?.filter(c => c.followed) ?? [];
  return <section className="dashboard-courses"><div className="row spread"><h2>{t("Мои курсы", "My courses")}</h2><Link className="button secondary" href="/courses">{t("Выбрать курсы", "Choose courses")}</Link><Link className="button secondary" href="/bookmarks">{t("★ Закладки", "★ Bookmarks")}</Link></div>
    <ErrorNotice error={r.error} />{!r.data ? <Loading /> : !selected.length ? <Empty><Link href="/courses">{t("Выберите курсы, которые изучаете", "Choose the courses you are studying")} →</Link></Empty> : <div className="grid two">{selected.map(c => <article className="card" key={c.id}>
      <h3><Link href={`/courses/${c.slug}`}>{c.title} →</Link></h3><p className="muted">{c.count} {t("вопросов", "questions")} · MC {c.questionCounts.MC} · {t("Короткий ответ", "Short Answer")} {c.questionCounts.SHORT}</p>
      {c.locked ? <p>{t("Нужен доступ к материалам", "Access to materials is required")}</p> : <><label>{t("Решено", "Solved")}: {c.progress?.solved ?? 0} / {c.count}<progress value={Math.min(c.progress?.solved ?? 0, c.count)} max={Math.max(c.count, 1)} /></label><p className="muted">{c.progress?.selfSolved ?? 0} {t("решено по самооценке; остальные проверены автоматически", "self-assessed as solved; others checked automatically")}</p>
        <details><summary>{t("Главы и практика", "Chapters & practice")}</summary><ul className="chapter-index">{c.chapters.map(ch => <li key={ch.id}><Link href={`/courses/${c.slug}?chapter=${ch.id}`}>{ch.title}<span>{ch.count}</span></Link></li>)}</ul></details></>}
    </article>)}</div>}
  </section>;
}
