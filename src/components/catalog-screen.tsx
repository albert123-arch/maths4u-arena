"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useState, useEffect } from "react";
import { TopicStudyPanel, StudyStatus } from "./study-panel";
import type { CatalogDto, PracticeMode, courseCatalog, topicContent } from "@/lib/catalog";
import { ActorContext, api, ActionButton, Empty, ErrorNotice, Heading, Loading, MaterialAsset, MathContent, useLocale, useResource } from "./ui";
import { BasketPanel, useTaskBasket } from "./task-basket";
import { LessonPresentations } from "./lesson-presentations";
import { QuickPractice } from "./quick-practice";

export function CatalogTasks({ topicId, courseId, chapterId, mode, embedded = false, practice = false, bookmarksOnly = false }: { topicId?: string; courseId?:string; chapterId?:string; mode?: PracticeMode; embedded?: boolean; practice?: boolean; bookmarksOnly?: boolean }) {
  const { t, lang } = useLocale(), actor = useContext(ActorContext), basket = useTaskBasket(), router = useRouter();
  const manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const allowed=["q","course","chapter","topic","category","year","session","paper","language","difficulty","page","pageSize","mode","progress","bookmarks"];
    let saved:Record<string,string>={};if(typeof window!=="undefined"){const url=new URLSearchParams(window.location.search);try{saved=JSON.parse(sessionStorage.getItem(`catalog:${actor?.id??"guest"}:${window.location.pathname}:${mode ?? "ALL"}`)??"{}");}catch{}for(const k of allowed)if(url.has(k))saved[k]=url.get(k)!;}
    return {q:"",page:"1",pageSize:"25",...Object.fromEntries(Object.entries(saved).filter(([k,v])=>allowed.includes(k)&&typeof v==="string")),...(courseId?{course:courseId}:{}),...(chapterId?{chapter:chapterId}:{}),...(topicId?{topic:topicId}:{}),...(mode?{mode}:{}),...(bookmarksOnly?{bookmarks:"1"}:{}),...(!actor?{progress:"",bookmarks:""}:{})};
  });
  useEffect(()=>{sessionStorage.setItem(`catalog:${actor?.id??"guest"}:${window.location.pathname}:${mode ?? "ALL"}`,JSON.stringify(filters));const q=new URLSearchParams(filters);window.history.replaceState(null,"",window.location.pathname+"?"+q.toString());},[filters,actor?.id,mode]);
  const result = useResource<CatalogDto>("catalog?" + new URLSearchParams(filters)), courses = useResource<Awaited<ReturnType<typeof courseCatalog>>>(embedded ? null : "catalog/courses");
  const update = (key: string, value: string) => setFilters(old => ({ ...old, [key]: value, page: "1", ...(["course", "chapter", "topic"].includes(key) ? { category: "", year: "", session: "", paper: "", difficulty: "", language: "" } : {}), ...(key === "course" ? { chapter: "", topic: "" } : key === "chapter" ? { topic: "" } : {}) }));
  const chapters = courses.data?.filter(c => !filters.course || c.id === filters.course).flatMap(c => c.chapters) ?? [];
  const topics = chapters.filter(c => !filters.chapter || c.id === filters.chapter).flatMap(ch => ch.topics);
  const categories: Record<string, string> = { UNKNOWN: t("Не указан", "Unspecified"), EXAM: t("Экзамен", "Exam"), TRAINING: t("Тренировочная", "Training"), OLYMPIAD: t("Олимпиадная", "Olympiad") };
  const select = (key: string, title: string, values: { id: string; title: string }[]) => <label key={key}>{title}<select aria-label={title} value={filters[key] ?? ""} onChange={e => update(key, e.target.value)}><option value="">{t("Все", "All")}</option>{values.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label>;
  const modeTitles = { MC: t("Multiple Choice", "Multiple Choice"), SHORT: t("Короткий ответ", "Short Answer"), WRITTEN: t("Письменное решение", "Written / Exam questions") };
  return <>{!mode && <div className="practice-tabs" aria-label={t("Тип ответа", "Answer type")}>
    {[{ id: "", title: t("Все вопросы", "All questions") }, ...Object.entries(modeTitles).map(([id, title]) => ({ id, title }))].map(v => <button className={filters.mode === v.id || !filters.mode && !v.id ? "selected" : "secondary"} key={v.id} aria-pressed={(filters.mode ?? "") === v.id} onClick={() => update("mode", v.id)}>{v.title}</button>)}
  </div>}{actor && !manage && <div className="practice-tabs progress-filters" aria-label={t("Прогресс практики", "Practice progress")}>
    {[["", t("Все", "All")], ["UNSOLVED", t("Не решены", "Unsolved")], ["SOLVED", t("Решены", "Solved")], ["ATTEMPTED", t("Есть попытки", "Attempted")], ["IN_PROGRESS", t("В работе", "In progress")], ["NEEDS_REPEAT", t("Повторить", "Another look")]].map(([id, title]) => <button className={(filters.progress ?? "") === id ? "selected" : "secondary"} aria-pressed={(filters.progress ?? "") === id} key={id} onClick={() => update("progress", id)}>{title}</button>)}
  </div>}<details className="catalog-filter-panel" open={!practice}><summary>{t("Поиск и фильтры", "Search & filters")}</summary><div className="catalog-filters"><label>{t("Поиск задачи", "Search tasks")}<input type="search" value={filters.q} onChange={e => update("q", e.target.value)} /></label>
    {!embedded && <>{select("course", t("Курс", "Course"), courses.data ?? [])}{select("chapter", t("Глава", "Chapter"), chapters)}{select("topic", t("Тема", "Topic"), topics)}</>}
    {result.data && <>{select("category", t("Тип материала", "Material type"), result.data.facets.categories.map(v => ({ id: String(v), title: categories[String(v)] })))}
      {result.data.facets.years.length > 0 && select("year", t("Год", "Year"), result.data.facets.years.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.sessions.length > 0 && select("session", t("Сессия", "Session"), result.data.facets.sessions.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.papers.length > 0 && select("paper", t("Вариант / paper", "Paper"), result.data.facets.papers.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.difficulties.length > 0 && select("difficulty", t("Сложность", "Difficulty"), result.data.facets.difficulties.map(v => ({ id: String(v), title: String(v) })))}
      {select("language", t("Язык материала", "Material language"), result.data.facets.languages.map(v => ({ id: String(v), title: String(v).toUpperCase() })))}</>}
  </div></details><ErrorNotice error={result.error || courses.error || basket.error} />
    {!result.data ? <Loading /> : <><p className="catalog-total" role="status">{t("Доступно задач: ", "Available tasks: ")}{result.data.total}</p>
      {!result.data.total && <Empty>{filters.progress ? t("Нет вопросов с таким статусом. Попробуйте другой фильтр.", "No questions match this progress filter. Try another filter.") : mode ? t("В этой теме пока нет вопросов выбранного типа.", "This topic has no questions of this answer type yet.") : t("Нет вопросов по выбранным условиям.", "No questions match these filters.")}</Empty>}
      {practice && result.data.items.length > 0 && <nav className="question-index" aria-label={t("Список вопросов", "Question list")}>{result.data.items.map(task => <a key={task.id} href={`#question-${task.id}`} aria-label={`${t("Вопрос", "Question")} ${task.number}`} className={task.progress?.solved ? "solved" : ""}>{task.number}</a>)}</nav>}
      <ol className="catalog-tasks" aria-busy={result.isLoading}>{result.data.items.map(task => <li key={task.id} id={`question-${task.id}`} className="catalog-task"><div className="task-summary"><span className="task-number">{task.number}</span>
        <details className="task-content" open={practice}><summary><strong>{task.version.title}</strong><span className="task-meta">{[task.version.source, task.version.year, task.version.examSession, task.version.paper ? "P" + task.version.paper : "", task.version.questionNumber ? "Q" + task.version.questionNumber : ""].filter(Boolean).join(" · ")}</span>{!manage && task.progress && (task.progress.solved ? <span className="badge">{t("Решено", "Solved")}{task.progress.helpUsed ? t(" · с помощью", " · with help") : ""}</span> : <StudyStatus state={task.progress.state} helpUsed={task.progress.helpUsed} />)}</summary>
          {task.version.locale!==lang&&<p className="muted">{t("Перевод RU отсутствует. Показан оригинал EN.","An English translation is unavailable. Showing the original.")}</p>}<MathContent html={task.version.statement} />{task.version.assets.map(a => <MaterialAsset key={a.id} asset={a} />)}
          {task.editable && <Link href={`/teacher/tasks/${task.id}`}>{t("Редактировать", "Edit")}</Link>}
          {!manage && (actor ? task.mode !== "WRITTEN" ? <QuickPractice task={task} lessonId={topicId} changed={result.refresh} /> : <ActionButton label={t("Решение, MS и самооценка", "Solution, MS & self-check")} action={async () => { const a = await api<{ id: string }>("study/start", "POST", { taskId: task.id, lessonId: topicId }); router.push(`/attempts/${a.id}?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`); }} /> : <Link className="button" href={"/login?next="+encodeURIComponent(typeof window==="undefined"?"/courses":window.location.pathname+window.location.search)}>{t("Войти и решать", "Sign in to practise")}</Link>)}
        </details><span className="task-category">{categories[task.category]}</span><span className="task-points">{task.points} {t("б.", "pts")}</span>
        {actor ? <ActionButton secondary label={task.bookmarked ? t("★ Убрать закладку", "★ Remove bookmark") : t("☆ В закладки", "☆ Bookmark")} action={() => api(`learning/bookmarks/${task.id}`, "POST", { selected: !task.bookmarked })} onDone={result.refresh} /> : <Link className="button quiet" href="/login">{t("☆ Войти для закладки", "☆ Sign in to bookmark")}</Link>}
        {manage && <label className="task-select"><input aria-label={t("В набор: ", "Select: ") + task.version.title} type="checkbox" disabled={!basket.data || basket.busy} checked={basket.selection.includes(task.id)} onChange={e => { const checked = e.target.checked; void basket.change(ids => checked ? [...ids.filter(id => id !== task.id), task.id] : ids.filter(id => id !== task.id)).catch(() => {}); }} /><span>{t("В набор", "Select")}</span></label>}</div></li>)}</ol>
      <nav className="pagination row" aria-label={t("Страницы задач", "Task pages")}><button className="secondary" disabled={result.data.page === 1} onClick={() => setFilters(f => ({ ...f, page: String(result.data!.page - 1) }))}>← {t("Назад", "Previous")}</button><span>{result.data.page} / {result.data.pages}</span><button className="secondary" disabled={result.data.page >= result.data.pages} onClick={() => setFilters(f => ({ ...f, page: String(result.data!.page + 1) }))}>{t("Далее", "Next")} →</button></nav></>}
  </>;
}
export function CatalogScreen({ bookmarksOnly = false }: { bookmarksOnly?: boolean }) {
  const { t } = useLocale(), actor = useContext(ActorContext), manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  return <><Heading title={bookmarksOnly ? t("Мои закладки", "My bookmarks") : t("Каталог задач", "Task catalog")} subtitle={t("Курс → глава → тема. Один каталог для обучения и подготовки работ.", "Course → chapter → topic. One catalog for learning and assigning work.")}>{manage && <Link className="button secondary" href="/teacher/tasks/new">{t("Новая задача", "New task")}</Link>}</Heading>
    <div className={manage ? "catalog-with-basket" : ""}><section className="card"><CatalogTasks bookmarksOnly={bookmarksOnly} /></section>{manage && <aside><BasketPanel compact /></aside>}</div></>;
}

export function CourseCatalogScreen({ slug, home = false }: { slug?: string; home?: boolean }) {
  const { t } = useLocale(), actor = useContext(ActorContext);
  const r = useResource<Awaited<ReturnType<typeof courseCatalog>>>("catalog/courses" + (slug ? "?slug=" + encodeURIComponent(slug) : ""));
  const [chapter, setChapter] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("chapter") ?? "");
  const teacher = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const visible = home && actor ? r.data?.filter(c => c.followed) : r.data;
  const groups = [...new Set(visible?.map(c => c.groupLabel || "") ?? [])];
  const follow = (c: NonNullable<typeof r.data>[number]) => actor ? <ActionButton secondary label={c.followed ? t("Убрать из моих курсов", "Remove from my courses") : t("Добавить в мои курсы", "Add to my courses")} action={() => api(`learning/courses/${c.id}`, "POST", { selected: !c.followed })} onDone={r.refresh} /> : null;
  return <><Heading title={slug && r.data?.[0] ? r.data[0].title : home && actor ? t("Мои курсы", "My courses") : t("Курсы математики", "Mathematics courses")} subtitle={t("Выберите курс → главу → тему. Изучайте материал и переходите к практике.", "Choose a course → chapter → topic. Study the material, then practise.")}>
    {actor && !slug && <Link className="button secondary" href={home ? "/courses" : "/"}>{home ? t("Выбрать курсы", "Choose courses") : t("Мои курсы", "My courses")}</Link>}
    {home && actor && <Link className="button secondary" href={teacher ? "/teacher" : "/student"}>{teacher ? t("Кабинет учителя", "Teacher dashboard") : t("Кабинет ученика", "Student dashboard")} →</Link>}
  </Heading>{!actor && <p className="notice">{t("Материалы можно просматривать без регистрации. Войдите, чтобы отвечать на вопросы и сохранять прогресс.", "Browse the materials as a guest. Sign in to answer questions and save your progress.")} <Link href="/login">{t("Войти", "Sign in")} →</Link></p>}
    {slug && <Link href="/courses">← {t("Все курсы", "All courses")}</Link>}<ErrorNotice error={r.error} />
    {!r.data ? <Loading /> : !visible?.length ? <Empty>{home && actor ? <Link href="/courses">{t("Выберите курсы для обучения", "Choose the courses you want to study")} →</Link> : t("Курсов пока нет", "No courses yet")}</Empty> : !slug ? groups.map(group => <section className="course-group" key={group}>{group && <h2>{group}</h2>}<div className="course-catalog">{visible!.filter(c => (c.groupLabel || "") === group).map(c => <section className="card compact-course" key={c.id}>
      <h2><Link href={`/courses/${c.slug}`}>{c.title} →</Link></h2><p className="muted">{c.description}</p><p className="course-count">{c.count} {t("вопросов", "questions")} · {c.chapters.length} {t("глав", "chapters")}</p>
      {follow(c)}{c.progress && <p className="course-personal-progress">{t("Решено", "Solved")}: {c.progress.solved} / {c.count} · {c.progress.selfSolved} {t("по самооценке", "self-assessed")}</p>}
      {c.locked ? <p className="notice">{t("Для курса нужен доступ.", "This course requires access.")}</p> : <ul className="chapter-index">{c.chapters.map(ch => <li key={ch.id}><Link href={`/courses/${c.slug}?chapter=${ch.id}`}>{ch.title}<span>{ch.count}</span></Link></li>)}</ul>}
    </section>)}</div></section>) : r.data.map(c => {
      const selected = c.chapters.find(ch => ch.id === chapter) ?? c.chapters[0];
      return <div key={c.id}>{follow(c)}<p className="muted">{c.description} · {c.count} {t("вопросов", "questions")}</p>{c.locked ? <p className="notice">{t("Для этого курса нужен доступ по тарифу.", "This course requires subscription access.")}</p> : <div className="course-study-layout">
        <nav className="card chapter-navigation" aria-label={t("Главы курса", "Course chapters")}><h2>{t("Главы", "Chapters")}</h2>{c.chapters.map(ch => <button key={ch.id} className={selected?.id === ch.id ? "selected" : "secondary"} aria-current={selected?.id === ch.id ? "page" : undefined} onClick={() => { setChapter(ch.id); window.history.replaceState(null, "", `/courses/${c.slug}?chapter=${ch.id}`); }}><span>{ch.title}</span><span>{ch.count}</span></button>)}</nav>
        <section className="card chapter-topics"><h2>{selected?.title}</h2><p className="muted">{t("Откройте тему или сразу выберите нужную практику.", "Open a topic or go straight to the practice you need.")}</p>
          {!selected?.topics.length && <Empty />}{selected?.topics.map(topic => <article className="item topic-entry" key={topic.id}><h3><Link href={`/courses/${c.slug}/topics/${topic.id}`}>{topic.title} →</Link></h3>
            <div className="topic-shortcuts"><Link href={`/courses/${c.slug}/topics/${topic.id}`}>{t("Материалы", "Notes & examples")}</Link>
              {topic.questionCounts.MC > 0 && <Link href={`/courses/${c.slug}/topics/${topic.id}?mode=MC`}>MC · {topic.questionCounts.MC}</Link>}
              {topic.questionCounts.SHORT > 0 && <Link href={`/courses/${c.slug}/topics/${topic.id}?mode=SHORT`}>{t("Короткий ответ", "Short Answer")} · {topic.questionCounts.SHORT}</Link>}
              {topic.questionCounts.WRITTEN > 0 && <Link href={`/courses/${c.slug}/topics/${topic.id}?mode=WRITTEN`}>{t("Письменные / экзамен", "Written / Exam")} · {topic.questionCounts.WRITTEN}</Link>}
            </div></article>)}
        </section></div>}</div>;
    })}</>;
}

export function TopicScreen({ id }: { id: string }) {
  const { t } = useLocale(), actor = useContext(ActorContext), r = useResource<Awaited<ReturnType<typeof topicContent>>>(`catalog/topics/${id}`);
  const manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const [mode, setMode] = useState<PracticeMode | "NOTES">(() => {
    const m = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("mode");
    return m === "MC" || m === "SHORT" || m === "WRITTEN" ? m : "NOTES";
  });
  if (r.error) return <ErrorNotice error={r.error} />; if (!r.data) return <Loading />;
  const topic = r.data, path = `/courses/${topic.course.slug}/topics/${id}`;
  const tabs = [{ id: "NOTES" as const, title: t("Материалы и примеры", "Notes & examples"), count: null },
    { id: "MC" as const, title: "Multiple Choice", count: topic.questionCounts.MC },
    { id: "SHORT" as const, title: t("Короткий ответ", "Short Answer"), count: topic.questionCounts.SHORT },
    { id: "WRITTEN" as const, title: t("Письменные / экзамен", "Written / Exam questions"), count: topic.questionCounts.WRITTEN }];
  const choose = (value: typeof mode) => { setMode(value); window.history.replaceState(null, "", path + (value === "NOTES" ? "" : "?mode=" + value)); };
  return <><nav className="breadcrumbs"><Link href="/courses">{t("Курсы", "Courses")}</Link><span> / </span><Link href={`/courses/${topic.course.slug}`}>{topic.course.title}</Link><span> / </span><Link href={`/courses/${topic.course.slug}?chapter=${topic.chapter.id}`}>{topic.chapter.title}</Link></nav>
    <Heading title={topic.title} /><div className="row spread topic-neighbours">{topic.previous ? <Link href={`/courses/${topic.course.slug}/topics/${topic.previous.id}`}>← {topic.previous.title}</Link> : <span />}{topic.next && <Link href={`/courses/${topic.course.slug}/topics/${topic.next.id}`}>{topic.next.title} →</Link>}</div>
    <nav className="practice-tabs topic-tabs" aria-label={t("Материалы темы", "Topic activities")}>{tabs.map(tab => <button key={tab.id} aria-pressed={mode === tab.id} className={mode === tab.id ? "selected" : "secondary"} onClick={() => choose(tab.id)}>{tab.title}{tab.count !== null && <span className="tab-count">{tab.count}</span>}</button>)}</nav>
    {mode === "NOTES" ? <><section className="card topic-theory"><h2>{t("Материалы", "Notes")}</h2>{topic.body ? <MathContent html={topic.body} /> : <p className="muted">{t("В источнике нет теории для этой темы.", "The source provides no notes for this topic.")}</p>}
      <h2>{t("Разобранные примеры", "Worked examples")}</h2>{topic.examples ? <MathContent html={topic.examples} /> : <p className="muted">{t("Разобранные примеры не предоставлены.", "No worked examples were provided.")}</p>}
    </section>{manage && <LessonPresentations key={id} lessonId={id} />}{actor && !manage && <TopicStudyPanel lessonId={id} />}
      <section className="card topic-start"><h2>{t("Перейти к практике", "Practise this topic")}</h2><div className="topic-shortcuts">{tabs.filter(tab => tab.count !== null && tab.count > 0).map(tab => <button className="secondary" key={tab.id} onClick={() => choose(tab.id)}>{tab.title} · {tab.count} →</button>)}</div></section>
    </> : <><p className="muted">{mode === "MC" ? t("Выберите ответ и отправьте его на проверку.", "Choose an answer, then submit it to check.") : mode === "SHORT" ? t("Введите короткий ответ. Результат появится после отправки.", "Enter a short answer. Your result appears after submission.") : t("Решите на бумаге, сравните с решением или MS и отметьте свой результат. Отправка решения и файлов доступна в заданиях учителя.", "Work on paper, compare with the solution or mark scheme, and record your result. Submit solutions and files in your teacher’s assignments.")}</p>
      <div className={manage ? "catalog-with-basket" : ""}><section className="card"><CatalogTasks key={`${id}/${mode}`} topicId={id} mode={mode} embedded practice /></section>{manage && <aside><BasketPanel compact /></aside>}</div></>}
  </>;
}
