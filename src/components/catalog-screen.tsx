"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import type { TopicStudyDto } from "@/lib/study";
import { TopicStudyPanel, StudyStatus } from "./study-panel";
import type { CatalogDto, courseCatalog, topicContent } from "@/lib/catalog";
import { ActorContext, api, ActionButton, Empty, ErrorNotice, Heading, Loading, MaterialAsset, MathContent, useLocale, useResource } from "./ui";
import { BasketPanel, useTaskBasket } from "./task-basket";

export function CatalogTasks({ topicId, embedded = false }: { topicId?: string; embedded?: boolean }) {
  const { t } = useLocale(), actor = useContext(ActorContext), basket = useTaskBasket(), router = useRouter();
  const manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const [filters, setFilters] = useState<Record<string, string>>(() => ({ q: typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q") ?? "", page: "1", pageSize: "25", ...(topicId ? { topic: topicId } : {}) }));
  const progress = useResource<TopicStudyDto>(actor && !manage && topicId ? `study/topics/${topicId}` : null);
  const result = useResource<CatalogDto>("catalog?" + new URLSearchParams(filters)), courses = useResource<Awaited<ReturnType<typeof courseCatalog>>>(embedded ? null : "catalog/courses");
  const update = (key: string, value: string) => setFilters(old => ({ ...old, [key]: value, page: "1", ...(["course", "chapter", "topic"].includes(key) ? { category: "", year: "", session: "", paper: "", difficulty: "", language: "" } : {}), ...(key === "course" ? { chapter: "", topic: "" } : key === "chapter" ? { topic: "" } : {}) }));
  const chapters = courses.data?.filter(c => !filters.course || c.id === filters.course).flatMap(c => c.chapters) ?? [];
  const topics = chapters.filter(c => !filters.chapter || c.id === filters.chapter).flatMap(ch => ch.topics);
  const categories: Record<string, string> = { UNKNOWN: t("Не указан", "Unspecified"), EXAM: t("Экзамен", "Exam"), TRAINING: t("Тренировочная", "Training"), OLYMPIAD: t("Олимпиадная", "Olympiad") };
  const select = (key: string, title: string, values: { id: string; title: string }[]) => <label key={key}>{title}<select aria-label={title} value={filters[key] ?? ""} onChange={e => update(key, e.target.value)}><option value="">{t("Все", "All")}</option>{values.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label>;
  return <><div className="catalog-filters"><label>{t("Поиск задачи", "Search tasks")}<input type="search" value={filters.q} onChange={e => update("q", e.target.value)} /></label>
    {!embedded && <>{select("course", t("Курс", "Course"), courses.data ?? [])}{select("chapter", t("Глава", "Chapter"), chapters)}{select("topic", t("Тема", "Topic"), topics)}</>}
    {result.data && <>{select("category", t("Тип материала", "Material type"), result.data.facets.categories.map(v => ({ id: String(v), title: categories[String(v)] })))}
      {result.data.facets.years.length > 0 && select("year", t("Год", "Year"), result.data.facets.years.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.sessions.length > 0 && select("session", t("Сессия", "Session"), result.data.facets.sessions.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.papers.length > 0 && select("paper", t("Вариант / paper", "Paper"), result.data.facets.papers.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.difficulties.length > 0 && select("difficulty", t("Сложность", "Difficulty"), result.data.facets.difficulties.map(v => ({ id: String(v), title: String(v) })))}
      {select("language", t("Язык материала", "Material language"), result.data.facets.languages.map(v => ({ id: String(v), title: String(v).toUpperCase() })))}</>}
  </div><ErrorNotice error={result.error || courses.error || basket.error} />
    {!result.data || result.isLoading ? <Loading /> : <><p className="catalog-total" role="status">{t("Доступно задач: ", "Available tasks: ")}{result.data.total}</p>
      {!result.data.total && <Empty />}
      <ol className="catalog-tasks">{result.data.items.map(task => <li key={task.id} className="catalog-task"><div className="task-summary"><span className="task-number">{task.number}</span>
        <details className="task-content"><summary><strong>{task.version.title}</strong><span className="task-meta">{[task.version.source, task.version.year, task.version.examSession, task.version.paper ? "P" + task.version.paper : "", task.version.questionNumber ? "Q" + task.version.questionNumber : ""].filter(Boolean).join(" · ")}</span>{!manage && progress.data && <StudyStatus state={progress.data.items.find(i => i.taskId === task.id)?.state ?? "NOT_STARTED"} helpUsed={progress.data.items.find(i => i.taskId === task.id)?.helpUsed} />}</summary>
          <MathContent html={task.version.statement} />{task.version.assets.map(a => <MaterialAsset key={a.id} asset={a} />)}
          {task.editable && <Link href={`/teacher/tasks/${task.id}`}>{t("Редактировать", "Edit")}</Link>}
          {!manage && (actor ? <ActionButton label={progress.data?.items.find(i => i.taskId === task.id)?.state === "IN_PROGRESS" ? t("Продолжить", "Continue") : t("Решать", "Practise")} action={async () => { const a = await api<{ id: string }>("study/start", "POST", { taskId: task.id, lessonId: topicId }); router.push(`/attempts/${a.id}`); }} /> : <Link className="button" href="/login">{t("Войти и решать", "Sign in to practise")}</Link>)}
        </details><span className="task-category">{categories[task.category]}</span><span className="task-points">{task.points} {t("б.", "pts")}</span>
        {manage && <label className="task-select"><input aria-label={t("В набор: ", "Select: ") + task.version.title} type="checkbox" disabled={!basket.data || basket.busy} checked={basket.selection.includes(task.id)} onChange={e => { const checked = e.target.checked; void basket.change(ids => checked ? [...ids.filter(id => id !== task.id), task.id] : ids.filter(id => id !== task.id)).catch(() => {}); }} /><span>{t("В набор", "Select")}</span></label>}</div></li>)}</ol>
      <nav className="pagination row" aria-label={t("Страницы задач", "Task pages")}><button className="secondary" disabled={result.data.page === 1} onClick={() => setFilters(f => ({ ...f, page: String(result.data!.page - 1) }))}>← {t("Назад", "Previous")}</button><span>{result.data.page} / {result.data.pages}</span><button className="secondary" disabled={result.data.page >= result.data.pages} onClick={() => setFilters(f => ({ ...f, page: String(result.data!.page + 1) }))}>{t("Далее", "Next")} →</button></nav></>}
  </>;
}
export function CatalogScreen() {
  const { t } = useLocale(), actor = useContext(ActorContext), manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  return <><Heading title={t("Каталог задач", "Task catalog")} subtitle={t("Курс → глава → тема. Один каталог для обучения и подготовки работ.", "Course → chapter → topic. One catalog for learning and assigning work.")}>{manage && <Link className="button secondary" href="/teacher/tasks/new">{t("Новая задача", "New task")}</Link>}</Heading>
    <div className={manage ? "catalog-with-basket" : ""}><section className="card"><CatalogTasks /></section>{manage && <aside><BasketPanel compact /></aside>}</div></>;
}
export function CourseCatalogScreen({ slug }: { slug?: string }) {
  const { t } = useLocale(), r = useResource<Awaited<ReturnType<typeof courseCatalog>>>("catalog/courses" + (slug ? "?slug=" + encodeURIComponent(slug) : ""));
  return <><Heading title={slug && r.data?.[0] ? r.data[0].title : t("Курсы", "Courses")} subtitle={t("Выберите главу и тему для занятий.", "Choose a chapter and topic to study.")} />{slug && <Link href="/courses">← {t("Все курсы", "All courses")}</Link>}<ErrorNotice error={r.error} />
    {!r.data ? <Loading /> : !r.data.length ? <Empty /> : <div className="course-catalog">{r.data.map(c => <section className="card" key={c.id}>{!slug && <div className="row spread"><h2><Link href={`/courses/${c.slug}`}>{c.title}</Link></h2><span>{c.count} {t("доступных задач", "available tasks")}</span></div>}<p className="muted">{c.description}</p>
      {c.locked ? <p className="notice">{t("Для этого курса нужен доступ по тарифу.", "This course requires subscription access.")}</p> : c.chapters.map(ch => <section className="course-chapter" key={ch.id}><div className="row spread"><h3>{ch.title}</h3><span className="muted">{ch.count}</span></div>
        <ul>{ch.topics.map(topic => <li key={topic.id}><Link href={`/courses/${c.slug}/topics/${topic.id}`}>{topic.title === ch.title && ch.topics.length === 1 ? t("Открыть тему", "Open topic") : topic.title}<span>{topic.count} {t("задач", "tasks")} →</span></Link></li>)}</ul></section>)}</section>)}</div>}</>;
}
export function TopicScreen({ id }: { id: string }) {
  const { t } = useLocale(), actor = useContext(ActorContext), r = useResource<Awaited<ReturnType<typeof topicContent>>>(`catalog/topics/${id}`), manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  if (r.error) return <ErrorNotice error={r.error} />; if (!r.data) return <Loading />; const topic = r.data;
  return <><nav className="breadcrumbs"><Link href="/courses">{t("Курсы", "Courses")}</Link><span> / </span><Link href={`/courses/${topic.course.slug}`}>{topic.course.title}</Link>{topic.chapter.title !== topic.title && <span> / {topic.chapter.title}</span>}</nav>
    <Heading title={topic.title} /><div className="row spread topic-neighbours">{topic.previous ? <Link href={`/courses/${topic.course.slug}/topics/${topic.previous.id}`}>← {topic.previous.title}</Link> : <span />}{topic.next && <Link href={`/courses/${topic.course.slug}/topics/${topic.next.id}`}>{topic.next.title} →</Link>}</div>
    <section className="card topic-theory"><details><summary>{t("Теория", "Theory")}</summary>{topic.body ? <MathContent html={topic.body} /> : <p className="muted">{t("В источнике нет теории для этой темы.", "The source provides no theory for this topic.")}</p>}</details><details><summary>{t("Разобранные примеры", "Worked examples")}</summary>{topic.examples ? <MathContent html={topic.examples} /> : <p className="muted">{t("Разобранные примеры не предоставлены.", "No worked examples were provided.")}</p>}</details></section>
    {actor && !manage && <TopicStudyPanel lessonId={id} />}
    <div className={manage ? "catalog-with-basket" : ""}><section className="card"><h2>{t("Задачи темы", "Topic tasks")}</h2><CatalogTasks key={id} topicId={id} embedded /></section>{manage && <aside><BasketPanel compact /></aside>}</div></>;
}
