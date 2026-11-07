"use client";
import {ReportError} from "./report-error";
import { useView } from "./view-state";
import { Button, ButtonLink, Input, Select } from "./controls";
import Link from "next/link";
import { useContext, useState, useEffect, useRef } from "react";
import { TopicStudyPanel, StudyStatus } from "./study-panel";
import type { CatalogDto, PracticeMode, courseCatalog, topicContent } from "@/lib/catalog";
import { ActorContext, PublicLocaleContext, api, ActionButton, Empty, ErrorNotice, Heading, MaterialAsset, MathContent, useLocale, useResource } from "./ui";
import { displayTitle, programKey, programName, programOrder } from "@/lib/public-presentation";
import type { PublicPageData } from "@/lib/public-page-model";
import { BasketPanel, useTaskBasket } from "./task-basket";
import { LessonPresentations } from "./lesson-presentations";
import { ArchiveOriginNavigation } from './admin-archive-links';

// Original imports store a shared stem and independent per-part prompts. Legacy
// imports already contain the complete question in statement; keep that display.
function OriginalQuestionParts({ version }: { version: { separatePartPrompts?: boolean; parts: { id: string; prompt: string; maxPoints: number }[] } }) {
  if (!version.separatePartPrompts) return null;
  return <ol className="original-question-parts" type="a">{version.parts.map(part => <li key={part.id}><MathContent html={part.prompt} /><span className="marks">[{part.maxPoints}]</span></li>)}</ol>;
}
import { CatalogQuestionLearning } from "./catalog-question-learning";
import { Pure1Review } from "./pure1-review";
export function CatalogSkeleton() { return <div className="catalog-skeleton" role="status" aria-label="Loading materials"><span /><span /><span /></div>; }

export function CatalogTasks({ topicId, courseId, chapterId, mode, embedded = false, practice = false, bookmarksOnly = false, initial,adminArchive=false }: { topicId?: string; courseId?:string; chapterId?:string; mode?: PracticeMode; embedded?: boolean; practice?: boolean; bookmarksOnly?: boolean; initial?: PublicPageData;adminArchive?:boolean }) {
  const lens = useView();
  const { t, lang } = useLocale(), actor = useContext(ActorContext), publicLocale = useContext(PublicLocaleContext), basket = useTaskBasket();
  const manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const archive=!!actor?.roles.some(r=>r.role==='ADMIN')&&!lens;
  const [reviewTask]=useState(()=>{if(typeof window==="undefined"||!practice)return "";const id=new URLSearchParams(window.location.search).get("reviewTask")??"";return /^[a-z0-9_]{1,100}$/.test(id)?id:"";});
  const reviewScrolled=useRef(false);
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const allowed=["q","course","chapter","topic","category","year","session","paper","language","difficulty","page","pageSize","mode","progress","bookmarks","source","taskId","legacyLesson"];
    let saved:Record<string,string>={...initial?.filters};if(!initial&&typeof window!=="undefined"){const url=new URLSearchParams(window.location.search);try{if(!lens&&!(["course","chapter","topic","taskId","legacyLesson"].some(key=>url.has(key))))saved=JSON.parse(sessionStorage.getItem(`catalog:${actor?.id??"guest"}:${window.location.pathname}:${mode ?? "ALL"}`)??"{}");}catch{}for(const k of allowed)if(url.has(k))saved[k]=url.get(k)!;}
    return {q:"",page:"1",pageSize:"25",...Object.fromEntries(Object.entries(saved).filter(([k,v])=>allowed.includes(k)&&typeof v==="string")),...(courseId?{course:courseId}:{}),...(chapterId?{chapter:chapterId}:{}),...(topicId?{topic:topicId}:{}),...(mode?{mode}:{}),...(bookmarksOnly?{bookmarks:"1"}:{}),...(reviewTask?{q:"",page:"1",progress:"",bookmarks:"",category:"",year:"",session:"",paper:"",difficulty:"",language:""}:{}),...(!actor?{progress:"",bookmarks:""}:{})};
  });
  useEffect(()=>{if(!lens)sessionStorage.setItem(`catalog:${actor?.id??"guest"}:${window.location.pathname}:${mode ?? "ALL"}`,JSON.stringify(filters));const q=new URLSearchParams(filters);if(reviewTask)q.set("reviewTask",reviewTask);window.history.replaceState(null,"",window.location.pathname+"?"+q.toString()+window.location.hash);},[filters,actor?.id,mode,reviewTask,lens]);
  const result = useResource<CatalogDto>("catalog?" + new URLSearchParams({ ...filters,source:archive?(adminArchive?(filters.source||'CAMBRIDGE'):'ORIGINAL'):'',...(!archive?{taskId:'',legacyLesson:''}:{}), ...(publicLocale === "ru" ? { language: "ru" } : {}) }), initial?.catalog), courses = useResource<Awaited<ReturnType<typeof courseCatalog>>>(embedded ? null : adminArchive?"admin/course-tree/catalog":"catalog/courses", initial?.courses);
  useEffect(()=>{if(reviewTask&&result.data&&!reviewScrolled.current){const el=document.getElementById("question-"+reviewTask);if(el){el.scrollIntoView({block:"start"});reviewScrolled.current=true;}}},[reviewTask,result.data]);
  const update = (key: string, value: string) => setFilters(old => ({ ...old, [key]: value, page: "1", ...(["course", "chapter", "topic"].includes(key) ? { category: "", year: "", session: "", paper: "", difficulty: "", language: "" } : {}), ...(key === "course" ? { chapter: "", topic: "" } : key === "chapter" ? { topic: "" } : {}) }));
  const chapters = courses.data?.filter(c => !filters.course || c.id === filters.course).flatMap(c => [...c.chapters,...(adminArchive?c.archiveChapters??[]:[])]) ?? [];
  const topics = chapters.filter(c => !filters.chapter || c.id === filters.chapter).flatMap(ch => [...ch.topics,...(adminArchive&&ch.unallocated?[{id:ch.unallocated.id,title:t("Не распределено","Unallocated")}]:[])]);
  const categories: Record<string, string> = { UNKNOWN: t("Не указан", "Unspecified"), EXAM: t("Экзамен", "Exam"), TRAINING: t("Тренировочная", "Training"), OLYMPIAD: t("Олимпиадная", "Olympiad") };
  const select = (key: string, title: string, values: { id: string; title: string }[]) => <label key={key}>{title}<Select aria-label={title} value={filters[key] ?? ""} onChange={e => update(key, e.target.value)}><option value="">{t("Все", "All")}</option>{values.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</Select></label>;
  const modeTitles = { MC: t("Выбор ответа", "Multiple choice"), SHORT: t("Короткий ответ", "Short answer"), WRITTEN: t("Письменные задачи", "Exam questions") };
  return <>{!mode && <div className="practice-tabs" aria-label={t("Тип ответа", "Answer type")}>
    {[{ id: "", title: t("Все вопросы", "All questions") }, ...Object.entries(modeTitles).map(([id, title]) => ({ id, title }))].map(v => <Button className={filters.mode === v.id || !filters.mode && !v.id ? "selected" : "secondary"} key={v.id} aria-pressed={(filters.mode ?? "") === v.id} onClick={() => update("mode", v.id)}>{v.title}</Button>)}
  </div>}{actor && !manage && <div className="practice-tabs progress-filters" aria-label={t("Прогресс практики", "Practice progress")}>
    {[["", t("Все", "All")], ["UNSOLVED", t("Не решены", "Unsolved")], ["SOLVED", t("Решены", "Solved")], ["ATTEMPTED", t("Есть попытки", "Attempted")], ["IN_PROGRESS", t("В работе", "In progress")], ["NEEDS_REPEAT", t("Повторить", "Another look")]].map(([id, title]) => <Button className={(filters.progress ?? "") === id ? "selected" : "secondary"} aria-pressed={(filters.progress ?? "") === id} key={id} onClick={() => update("progress", id)}>{title}</Button>)}
  </div>}{archive&&adminArchive&&<label>{t("Источник","Source")}<Select aria-label={t("Источник","Source")} value={filters.source||"CAMBRIDGE"} onChange={e=>update("source",e.target.value)}><option value="CAMBRIDGE">{t("Архив Cambridge","Cambridge archive")}</option><option value="ORIGINAL">{t("Оригинальные","Original questions")}</option><option value="ALL">{t("Все","All sources")}</option></Select></label>}<details className="catalog-filter-panel" open={!practice}><summary>{t("Поиск и фильтры", "Search & filters")}</summary><div className="catalog-filters"><label>{t("Поиск задачи", "Search tasks")}<Input type="search" value={filters.q} onChange={e => update("q", e.target.value)} /></label>
    {!embedded && <>{select("course", t("Курс", "Course"), courses.data ?? [])}{select("chapter", t("Глава", "Chapter"), chapters)}{select("topic", t("Тема", "Topic"), topics)}</>}
    {result.data && <>{select("category", t("Тип материала", "Material type"), result.data.facets.categories.map(v => ({ id: String(v), title: categories[String(v)] })))}
      {result.data.facets.years.length > 0 && select("year", t("Год", "Year"), result.data.facets.years.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.sessions.length > 0 && select("session", t("Сессия", "Session"), result.data.facets.sessions.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.papers.length > 0 && select("paper", t("Вариант / paper", "Paper"), result.data.facets.papers.map(v => ({ id: String(v), title: String(v) })))}
      {result.data.facets.difficulties.length > 0 && select("difficulty", t("Сложность", "Difficulty"), result.data.facets.difficulties.map(v => ({ id: String(v), title: String(v) })))}
      {publicLocale !== "ru" && select("language", t("Язык материала", "Material language"), result.data.facets.languages.map(v => ({ id: String(v), title: String(v).toUpperCase() })))}</>}
  </div></details><ErrorNotice error={result.error || courses.error || basket.error} />{archive&&adminArchive&&filters.legacyLesson&&<ArchiveOriginNavigation legacyLesson={filters.legacyLesson}/>}
    {reviewTask&&<p className="notice">{t("Начните с выделенной проверки для повторения. Остальные вопросы темы доступны ниже.","Start with the highlighted review check. Other questions in this topic remain available below.")}</p>}
    {!result.data ? <CatalogSkeleton /> : <><p className="catalog-total" role="status">{t("Доступно задач: ", "Available tasks: ")}{result.data.total}</p>
      {!result.data.total && <Empty>{filters.progress ? t("Нет вопросов с таким статусом. Попробуйте другой фильтр.", "No questions match this progress filter. Try another filter.") : mode ? t("В этой теме пока нет вопросов выбранного типа.", "This topic has no questions of this answer type yet.") : t("Нет вопросов по выбранным условиям.", "No questions match these filters.")}</Empty>}
      {practice && result.data.items.length > 0 && <nav className="question-index" aria-label={t("Список вопросов", "Question list")}>{result.data.items.map(task => <a key={task.id} href={`#question-${task.id}`} aria-label={`${t("Вопрос", "Question")} ${task.number}`} className={task.progress?.solved ? "solved" : ""}>{task.number}</a>)}</nav>}
      <ol className="catalog-tasks" aria-busy={result.isLoading}>{result.data.items.map(task => <li key={task.id} id={`question-${task.id}`} data-review-target={task.id===reviewTask?"true":undefined} className="catalog-task"><div className="task-summary"><span className="task-number">{task.number}</span>
        <details className="task-content" open={practice}><summary><strong>{displayTitle(task.version.title)}</strong><span className="task-meta">{[/^Maths4U Original/.test(task.version.source ?? "") ? "" : task.version.source, task.version.year, task.version.examSession, task.version.paper ? "P" + task.version.paper : "", task.version.questionNumber ? "Q" + task.version.questionNumber : ""].filter(Boolean).join(" · ")}</span>{!manage && task.progress && (task.progress.solved ? <span className="badge">{t("Решено", "Solved")}{task.progress.helpUsed ? t(" · с помощью", " · with help") : ""}</span> : <StudyStatus state={task.progress.state} helpUsed={task.progress.helpUsed} />)}</summary>
          <div className="task-body">{task.version.locale!==lang&&<p className="muted">{t("Перевод RU отсутствует. Показан оригинал EN.","An English translation is unavailable. Showing the original.")}</p>}<MathContent html={task.version.statement} /><OriginalQuestionParts version={task.version} />{task.version.assets.map(a => <MaterialAsset key={a.id} asset={a} />)}
          {archive&&(task.related?.length??0)>0&&<nav className="archive-related" aria-label={t("Связанные задачи","Related questions")}>{task.related?.map(link=><Link key={link.id} href={link.href}>{link.label==="Cambridge source"?t("Сравнить с источником Cambridge","Compare with Cambridge source"):t("Адаптация: ","Adaptation: ")+link.label} →</Link>)}</nav>}{task.editable && <Link href={`/teacher/tasks/${task.id}`}>{t("Редактировать", "Edit")}</Link>}
          <CatalogQuestionLearning task={task} lessonId={topicId} changed={result.refresh}/><ReportError taskVersionId={task.version.id}/></div>
        </details><span className="task-category">{categories[task.category]}</span><span className="task-points">{task.points} {t("б.", "pts")}</span>
        <div className="task-bookmark">{actor ? <ActionButton secondary label={task.bookmarked ? t("★ Убрать закладку", "★ Remove bookmark") : t("☆ В закладки", "☆ Bookmark")} action={() => api(`learning/bookmarks/${task.id}`, "POST", { selected: !task.bookmarked })} onDone={result.refresh} /> : <ButtonLink className="button quiet" href="/login">{t("☆ Войти для закладки", "☆ Sign in to bookmark")}</ButtonLink>}</div>
        {manage && <label className="task-select"><Input aria-label={t("В набор: ", "Select: ") + task.version.title} type="checkbox" disabled={!basket.data || basket.busy || !!task.examArchivedAt} checked={basket.selection.includes(task.id)} onChange={e => { const checked = e.target.checked; void basket.change(ids => checked ? [...ids.filter(id => id !== task.id), task.id] : ids.filter(id => id !== task.id)).catch(() => {}); }} /><span>{t("В набор", "Select")}</span></label>}</div></li>)}</ol>
      <nav className="pagination row" aria-label={t("Страницы задач", "Task pages")}><Button className="secondary" disabled={result.data.page === 1} onClick={() => setFilters(f => ({ ...f, page: String(result.data!.page - 1) }))}>← {t("Назад", "Previous")}</Button><span>{result.data.page} / {result.data.pages}</span><Button className="secondary" disabled={result.data.page >= result.data.pages} onClick={() => setFilters(f => ({ ...f, page: String(result.data!.page + 1) }))}>{t("Далее", "Next")} →</Button></nav></>}
  </>;
}
export function CatalogScreen({ bookmarksOnly = false, initial }: { bookmarksOnly?: boolean; initial?: PublicPageData }) {
  const { t } = useLocale(), actor = useContext(ActorContext), manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  return <><Heading title={bookmarksOnly ? t("Мои закладки", "My bookmarks") : t("Практика", "Practice")} subtitle={t("Найдите вопросы по курсу и теме.", "Find questions by course and topic.")}>{manage && <ButtonLink className="button secondary" href="/teacher/tasks/new">{t("Новая задача", "New task")}</ButtonLink>}</Heading>
    <div className={manage ? "catalog-with-basket" : ""}><section className="card"><CatalogTasks bookmarksOnly={bookmarksOnly} initial={initial} /></section>{manage && <aside><BasketPanel compact /></aside>}</div></>;
}

function ChapterIndex({ course, prefix }: { course: Awaited<ReturnType<typeof courseCatalog>>[number]; prefix: string }) {
  const { t } = useLocale(), [expanded, setExpanded] = useState(false);
  return <><ul className="chapter-index">{course.chapters.slice(0, expanded ? undefined : 5).map(ch => <li key={ch.id}><Link href={prefix+(ch.path??("/courses/"+course.slug+"?chapter="+ch.id))}><strong>{ch.title}</strong><span>{ch.count} {t("вопросов", "questions")}</span></Link></li>)}</ul>{course.chapters.length > 5 && <Button variant="text" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? t("Свернуть", "Show less") : t("Все главы", "Show all") + " (" + course.chapters.length + ")"}</Button>}</>;
}
export function CourseCatalogScreen({ slug, home = false, initial }: { slug?: string; home?: boolean; initial?: PublicPageData }) {
  const { t, lang } = useLocale(), actor = useContext(ActorContext), publicLocale = useContext(PublicLocaleContext), prefix = publicLocale === "ru" ? "/ru" : "";
  const r = useResource<Awaited<ReturnType<typeof courseCatalog>>>("catalog/courses" + (slug ? "?slug=" + encodeURIComponent(slug) : ""), initial?.courses);
  const [chapter, setChapter] = useState(() => initial?.chapter ?? (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("chapter") ?? ""));
  const teacher = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const visible = (home && actor ? r.data?.filter(c => c.followed) : r.data)?.toSorted((a,b) => programOrder(a.slug) - programOrder(b.slug));
  const groups = [...new Set(visible?.map(c => programKey(c.slug)) ?? [])];
  const follow = (c: NonNullable<typeof r.data>[number]) => actor ? <ActionButton secondary label={c.followed ? t("Убрать из моих курсов", "Remove from my courses") : t("Добавить в мои курсы", "Add to my courses")} action={() => api("learning/courses/" + c.id, "POST", { selected: !c.followed })} onDone={r.refresh} /> : null;
  const count = (n: number) => n + " " + t("вопросов", "questions");
  const currentCourse = slug ? r.data?.[0] : undefined;
  const chapterLink = (c: NonNullable<typeof r.data>[number], ch: NonNullable<typeof r.data>[number]["chapters"][number], selectedId?: string) => <Link key={ch.id} href={prefix+(ch.path??("/courses/"+c.slug+"?chapter="+ch.id))} aria-current={selectedId === ch.id ? "page" : undefined} onClick={e => {
    if (ch.path || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); setChapter(ch.id); history.replaceState(null, "", prefix + "/courses/" + c.slug + "?chapter=" + ch.id);
    const disclosure = e.currentTarget.closest("details"); if (disclosure) { disclosure.open = false; disclosure.querySelector("summary")?.focus({ preventScroll: true }); }
  }}><span>{ch.title}</span><small>{count(ch.count)}</small></Link>;
  return <><Heading title={initial?.chapterTitle??currentCourse?.title ?? (home && actor ? t("Мои курсы", "My courses") : t("Курсы математики", "Mathematics courses"))} subtitle={currentCourse ? programName(currentCourse.slug, lang === "ru") + " · " + count(currentCourse.count) : t("Выберите программу, главу и тему.", "Choose a programme, chapter and topic.")}>
    {currentCourse?.original && <span className="badge course-origin">Maths4U Original</span>}
    {actor && !slug && <ButtonLink href={home ? "/courses" : "/"}>{home ? t("Выбрать курсы", "Choose courses") : t("Мои курсы", "My courses")}</ButtonLink>}
    {home && actor && <ButtonLink href={teacher ? "/teacher" : "/student"}>{t("Мой кабинет", "My dashboard")} →</ButtonLink>}
  </Heading>{!actor && <p className="catalog-guest-note">{t("Материалы доступны без регистрации. Войдите, чтобы сохранять результаты.", "Browse the materials as a guest. Sign in to save your results.")} <Link href="/login">{t("Войти", "Sign in")} →</Link></p>}
    {home && <Pure1Review />}
    {slug && <Link href="/courses">← {t("Все курсы", "All courses")}</Link>}<ErrorNotice error={r.error} />
    {!r.data ? <CatalogSkeleton /> : !visible?.length ? <Empty>{t("Курсов пока нет", "No courses yet")}</Empty> : !slug ? groups.map(group => <section className="course-group" data-program={group} key={group}><h2>{programName(visible!.find(c => programKey(c.slug) === group)!.slug, lang === "ru")}</h2><div className="course-catalog">{visible!.filter(c => programKey(c.slug) === group).map(c => <section className="card compact-course" key={c.id}>
      <h2><Link href={prefix + "/courses/" + c.slug}>{c.title} →</Link></h2>{c.original && <span className="badge">Maths4U Original</span>}
      {c.description && !/^Maths4U Original pilot:/i.test(c.description) && <p className="muted">{c.description}</p>}
      <p className="course-count">{count(c.count)} · {c.chapters.length} {t("глав", "chapters")}</p>
      {follow(c)}{actor && c.progress && <p className="course-personal-progress">{t("Решено", "Solved")}: {c.progress.solved} / {c.count} · {c.progress.selfSolved} {t("по самооценке", "self-assessed")}</p>}
      {c.locked ? <p className="catalog-guest-note">{t("Для курса нужен доступ.", "This course requires access.")}</p> : <ChapterIndex course={c} prefix={prefix} />}
    </section>)}</div></section>) : visible.map(c => {
      const selected = c.chapters.find(ch => ch.id === chapter) ?? c.chapters[0], selectedIndex = c.chapters.findIndex(ch => ch.id === selected?.id);
      return <div key={c.id}>{follow(c)}{lang === "ru" && c.description && <p className="muted course-description">{c.description}</p>}{c.locked ? <p className="catalog-guest-note">{t("Для этого курса нужен доступ.", "This course requires access.")}</p> : <div className="course-study-layout">
        <nav className="card chapter-navigation" aria-label={t("Главы курса", "Course chapters")}><h2>{t("Главы", "Chapters")}</h2>{c.chapters.map(ch => chapterLink(c, ch, selected?.id))}</nav>
        <details className="chapter-mobile"><summary>{t("Глава", "Chapter")} · {selected?.title} ({selectedIndex + 1} {t("из", "of")} {c.chapters.length})<span aria-hidden="true">▾</span></summary><nav aria-label={t("Выбрать главу", "Choose a chapter")}>{c.chapters.map(ch => chapterLink(c, ch, selected?.id))}</nav></details>
        <section className="card chapter-topics"><h2>{selected?.title}</h2><p className="muted">{t("Откройте тему или выберите практику.", "Open a topic or choose your practice.")}</p>
          {!selected?.topics.length && <Empty />}{selected?.topics.map(topic => {
            const href = prefix + "/courses/" + c.slug + "/topics/" + topic.id;
            return <article className="item topic-entry" key={topic.id}><h3><Link href={href}>{topic.title} →</Link></h3><div className="topic-shortcuts"><Link href={href}>{t("Конспект и примеры", "Notes & examples")}</Link>
              {topic.questionCounts.MC > 0 && <Link href={href + "?mode=MC"}>{t("Выбор ответа", "Multiple choice")} · {topic.questionCounts.MC}</Link>}
              {topic.questionCounts.SHORT > 0 && <Link href={href + "?mode=SHORT"}>{t("Короткий ответ", "Short answer")} · {topic.questionCounts.SHORT}</Link>}
              {topic.questionCounts.WRITTEN > 0 && <Link href={href + "?mode=WRITTEN"}>{selected.writtenLabel === "exam-style" ? t("Авторские задачи", "Exam-style") : selected.writtenLabel === "exam" ? t("Экзаменационные задачи", "Exam questions") : t("Письменные задачи", "Written problems")} · {topic.questionCounts.WRITTEN}</Link>}
            </div></article>;
          })}
        </section></div>}</div>;
    })}</>;
}

export function TopicScreen({ id, initial }: { id: string; initial?: PublicPageData }) {
  const { t } = useLocale(), actor = useContext(ActorContext), publicLocale = useContext(PublicLocaleContext), r = useResource<Awaited<ReturnType<typeof topicContent>>>(`catalog/topics/${id}`, initial?.topic);
  const manage = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const [mode, setMode] = useState<PracticeMode | "NOTES">(() => {
    const m = initial?.mode ?? (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("mode"));
    return m === "MC" || m === "SHORT" || m === "WRITTEN" ? m : "NOTES";
  });
  useEffect(()=>{if(r.data?.redirectTo)window.location.replace(r.data.redirectTo);},[r.data?.redirectTo]);
  if (r.error) return <ErrorNotice error={r.error} />; if (!r.data) return <CatalogSkeleton />;
  const topic = r.data, prefix = publicLocale === "ru" ? "/ru" : "", path = `${prefix}/courses/${topic.course.slug}/topics/${id}`;
  const tabs = [{ id: "NOTES" as const, title: t("Материалы и примеры", "Notes & examples"), count: null },
    { id: "MC" as const, title: t("Выбор ответа", "Multiple choice"), count: topic.questionCounts.MC },
    { id: "SHORT" as const, title: t("Короткий ответ", "Short answer"), count: topic.questionCounts.SHORT },
    { id: "WRITTEN" as const, title: topic.writtenLabel === "exam-style" ? t("Авторские задачи", "Exam-style") : topic.writtenLabel === "exam" ? t("Экзаменационные задачи", "Exam questions") : t("Письменные задачи", "Written problems"), count: topic.questionCounts.WRITTEN }];
  const choose = (value: typeof mode) => { setMode(value); window.history.replaceState(null, "", path + (value === "NOTES" ? "" : "?mode=" + value)); };
  return <><nav className="breadcrumbs"><Link href="/courses">{t("Курсы", "Courses")}</Link><span> / </span><Link href={`${prefix}/courses/${topic.course.slug}`}>{topic.course.title}</Link><span> / </span><Link href={`${prefix}/courses/${topic.course.slug}?chapter=${topic.chapter.id}`}>{topic.chapter.title}</Link></nav>
    <Heading title={topic.title}>{manage && <ButtonLink href={"/teacher/works/new?topic=" + topic.id}>{t("Задание из темы", "Assign from this topic")} →</ButtonLink>}</Heading><div className="row spread topic-neighbours">{topic.previous ? <Link href={`${prefix}/courses/${topic.course.slug}/topics/${topic.previous.id}`}>← {topic.previous.title}</Link> : <span />}{topic.next && <Link href={`${prefix}/courses/${topic.course.slug}/topics/${topic.next.id}`}>{topic.next.title} →</Link>}</div>
    <nav className="practice-tabs topic-tabs" aria-label={t("Материалы темы", "Topic activities")}>{tabs.map(tab => <Button key={tab.id} aria-pressed={mode === tab.id} className={mode === tab.id ? "selected" : "secondary"} onClick={() => choose(tab.id)}>{tab.title}{tab.count !== null && <span className="tab-count">{tab.count}</span>}</Button>)}</nav>
    {mode === "NOTES" ? <><section className="card topic-theory"><h2>{t("Материалы", "Notes")}</h2>{topic.body ? <MathContent html={topic.body} /> : <p className="muted">{t("В источнике нет теории для этой темы.", "The source provides no notes for this topic.")}</p>}
      <h2>{t("Разобранные примеры", "Worked examples")}</h2>{topic.examples ? <MathContent html={topic.examples} /> : <p className="muted">{t("Разобранные примеры не предоставлены.", "No worked examples were provided.")}</p>}
    </section>{manage && <LessonPresentations key={id} lessonId={id} />}{actor && !manage && <TopicStudyPanel lessonId={id} />}
      <section className="card topic-start"><h2>{t("Перейти к практике", "Practise this topic")}</h2><div className="topic-shortcuts">{tabs.filter(tab => tab.count !== null && tab.count > 0).map(tab => <Button className="secondary" key={tab.id} onClick={() => choose(tab.id)}>{tab.title} · {tab.count} →</Button>)}</div></section>
    </> : <><p className="muted">{mode === "MC" ? t("Выберите ответ и отправьте его на проверку.", "Choose an answer, then submit it to check.") : mode === "SHORT" ? t("Введите короткий ответ. Результат появится после отправки.", "Enter a short answer. Your result appears after submission.") : t("Решите на бумаге, сравните с решением или MS и отметьте свой результат. Отправка решения и файлов доступна в заданиях учителя.", "Work on paper, compare with the solution or mark scheme, and record your result. Submit solutions and files in your teacher’s assignments.")}</p>
      <div className={manage ? "catalog-with-basket" : ""}><section className="card"><CatalogTasks key={`${id}/${mode}`} topicId={id} mode={mode} embedded practice initial={initial?.mode === mode ? initial : undefined} /></section>{manage && <aside><BasketPanel compact /></aside>}</div></>}
  </>;
}
