"use client";
import { Button, ButtonLink, Input } from "./controls";
import Link from "next/link";
import { useContext, useState, useSyncExternalStore } from "react";
import { ActorContext, useLocale } from "./ui";
import { SquareReviewCard } from "./square-progress";
import { quadraticTopics } from "@/lib/square-model";
import { courseLevels, levelHref, courseLabel, compareLearningCourses, discoverySample, learningDirections, searchDiscovery, type DiscoveryData, type DirectionKey } from "@/lib/discovery-model";

import { guestCourseSnapshot, parseGuestCourseChoice, subscribeGuestCourse } from "@/lib/guest-course-choice";

export type DiscoveryProps = { data: DiscoveryData; view: "home" | "direction" | "search" | "teachers"; direction?: DirectionKey; query?: string; resumeLessons?: Record<string, string[]>; selectedCourses?: string[]; searchAll?: boolean };
const Arrow = ({ external = false }: { external?: boolean }) => <span aria-hidden="true">{external ? "↗" : "→"}</span>;
export function DiscoveryHome({ data, view, direction, query = "", resumeLessons, selectedCourses, searchAll = false, sessionReady = false }: DiscoveryProps & { sessionReady?: boolean }) {
  const { lang, t } = useLocale(), actor = useContext(ActorContext);
  const [search, setSearch] = useState(query), [limit, setLimit] = useState(25);
  const local = <T extends { title: string; ru: string }>(row: T) => lang === "ru" ? row.ru : row.title;
  const active = learningDirections.find(d => d.key === direction);
  const courses = data.courses.filter(c => c.direction === direction).sort(compareLearningCourses);
  const hasPure1 = data.courses.some(c => c.slug === "maths4u-9709-p1");
  const guest = parseGuestCourseChoice(useSyncExternalStore(subscribeGuestCourse, guestCourseSnapshot, () => null));
  const resumeLevel = !actor && sessionReady && courseLevels.find(level => level.key === guest?.direction && data.courses.some(c => c.direction === level.key));
  const resumeCourse = resumeLevel && data.courses.find(c => c.direction === resumeLevel.key && c.slug === guest?.courseSlug);
  const lessonId = guest?.lessonHref?.split("/").at(-1);
  const resumeLesson = resumeCourse && lessonId && resumeLessons?.[resumeCourse.slug]?.includes(lessonId)
    ? { href: "/courses/" + resumeCourse.slug + "/topics/" + lessonId, title: guest?.lessonTitle } : null;
  const sample = direction ? discoverySample(data.items, direction) : undefined;
  const homeSamples = (["igcse", "a-level"] as const).flatMap(key => discoverySample(data.items, key) ?? []);
  const sampleLink = (item: typeof data.items[number]) => <Link className="discovery-sample" href={item.href} key={item.href}>
    <small>{courseLabel(item.courseSlug, lang === "ru" ? item.courseRu : item.course)}</small>
    <strong>{local(item)} <Arrow /></strong>
  </Link>;
  const teacher = actor?.roles.some(r => r.role === "ADMIN" || r.role === "TEACHER");
  const myCourseSearch = selectedCourses !== undefined && !searchAll;
  const results = view === "search" ? searchDiscovery(data.items, search) : [];
  function searchHref(all: boolean) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (all) params.set("scope", "all");
    return "/search" + (params.size ? "?" + params.toString() : "");
  }
  let searchEmptyState;
  if (myCourseSearch && !selectedCourses.length) {
    searchEmptyState = <p>Choose <Link href="/student#my-courses">your courses</Link> or <Link href={searchHref(true)}>search all courses</Link>.</p>;
  } else if (!search.trim()) {
    searchEmptyState = <p>{t("Попробуйте: quadratics, functions, matrices или 9709.", "Try quadratics, functions, matrices or 9709.")}</p>;
  } else if (!results.length) {
    searchEmptyState = myCourseSearch ? <p>No matches in your courses. <Link href={searchHref(true)}>Search all courses</Link></p>
      : <p>{t("Совпадений нет. Попробуйте более короткий запрос.", "No matching topics. Try a shorter search.")}</p>;
  }
  const searchForm = <form className="discovery-search" action="/search" method="get" role="search" aria-label={t("Поиск по курсам и темам", "Search courses and topics")}>
    {view === "search" && selectedCourses !== undefined && searchAll && <input type="hidden" name="scope" value="all" />}
    <label htmlFor="discovery-q">{t("Какую тему вы хотите изучить?", "What would you like to learn?")}</label>
    <div><Input id="discovery-q" name="q" type="search" value={search} maxLength={120} onChange={e => { setSearch(e.target.value); setLimit(25); }} placeholder={t("Тема или код курса", "Topic or course code")} /><Button type="submit">{t("Найти", "Search")} <Arrow /></Button></div>
  </form>;
  const directionCards = <section className="discovery-section" id="learning-directions" aria-labelledby="directions-title">
    <h2 id="directions-title">{t("Выберите уровень", "Find my course")}</h2>
    <div className="discovery-directions">{courseLevels.map(level => {
      const available = data.courses.filter(c => c.direction === level.key);
      const lessons = available.reduce((sum, c) => sum + c.topics, 0);
      return <Link className="discovery-direction" data-level={level.key} href={levelHref(level.key, data.courses)} key={level.key}>
        <div className="discovery-card-top"><b>{level.code}</b>{level.popular && <span className="discovery-popular">{t("Популярный", "Popular")}</span>}</div>
        <h3>{level.key === "school" ? <>Lower Secondary<br />{t("Ступени 7–9", "Stages 7–9")}</> : local(level)}</h3>
        <span className="discovery-card-bottom"><span>{t("Возраст", "Ages")} {level.age}</span>
          {available.length > 0 && <span>{lessons} {t("уроков", lessons === 1 ? "lesson" : "lessons")}</span>}</span>
      </Link>;
    })}</div>
    <Link className="discovery-olympiad" href="/learn/olympiad">{t("Олимпиадная математика", "Olympiad mathematics")} <Arrow /></Link>
  </section>;
  return <div className="discovery">
    {data.unavailable && <p className="notice" role="alert">{t("Каталог временно недоступен. Вы можете открыть материалы на основном сайте.", "The course catalogue is temporarily unavailable. You can still open the resources on the main site.")} <a href="https://maths4u.sbs/">Maths4U ↗</a></p>}
    {view === "home" && <>
      {resumeLevel && <div className="discovery-resume"><Link href={resumeCourse ? "/courses/" + encodeURIComponent(resumeCourse.slug) : levelHref(resumeLevel.key, data.courses)}>
        {t("Продолжить", "Continue")} · {resumeCourse ? courseLabel(resumeCourse.slug, local(resumeCourse)) : resumeLevel.code + " " + local(resumeLevel)} <Arrow /></Link>
        {resumeLesson && <Link href={resumeLesson.href}>{t("Последний урок", "Last lesson")}{resumeLesson.title && " · " + resumeLesson.title} <Arrow /></Link>}</div>}
      <header className="discovery-hero"><h1>{t("Математика Cambridge от Stage 7 до A Level", "Cambridge Maths from Stage 7 to A Level")}</h1>
        <p className="discovery-lead">{t("Изучайте тему на разобранных примерах, проверяйте ответы и возвращайтесь к сложным задачам.", "Learn with worked examples, check your answers and revisit the skills you need.")}</p>
      </header>
      {directionCards}
      {searchForm}
      {!!homeSamples.length && <section className="discovery-examples"><h2>{t("Попробуйте урок", "Try a lesson")}</h2><div>{homeSamples.map(sampleLink)}</div></section>}
      {hasPure1 && !actor && quadraticTopics.map(topic => <SquareReviewCard key={topic.key} topic={topic} sessionReady={sessionReady} />)}
      <section className="discovery-how"><h2>{t("Как заниматься", "How to use a lesson")}</h2><ol>
        <li><strong>{t("Разберитесь в методе", "Understand the method")}</strong><p>{t("Разберите один пример по шагам.", "Follow a worked example one step at a time.")}</p></li>
        <li><strong>{t("Попробуйте сами", "Try it yourself")}</strong><p>{t("Введите ответ и прочитайте подсказку.", "Enter your answer and use the feedback to check your reasoning.")}</p></li>
        <li><strong>{t("Закрепите навык", "Review the skill")}</strong><p>{t("Вернитесь к задаче и решите новый вариант.", "Return for a fresh question on a skill you found difficult.")}</p></li>
      </ol></section>
      <section className="discovery-teacher"><div><p className="eyebrow">{t("Для учителя", "For teachers")}</p><h2>{t("От темы урока — к работе класса", "From the lesson to your classroom")}</h2><p>{t("Подбирайте задачи, назначайте работы и просматривайте ответы учеников в одном месте.", "Choose questions, set work and review your students’ responses in one place.")}</p></div><ButtonLink className="button secondary" href={teacher ? "/teacher" : "/for-teachers"}>{teacher ? t("Открыть кабинет учителя", "Open teacher tools") : t("Посмотреть инструменты", "Explore the teaching tools")} →</ButtonLink></section>
    </>}
    {view === "direction" && active && <>
      <nav className="discovery-breadcrumb" aria-label="Breadcrumb"><Link href="/">Maths4U</Link><span aria-hidden="true">/</span><span>{local(active)}</span></nav>
      <header className="discovery-page-heading"><h1>{active.key !== "olympiad" && active.code + " · "}{local(active)}</h1><p>{lang === "ru" ? active.descriptionRu : active.description}</p></header>
      <nav className="discovery-switcher" aria-label={t("Сменить направление", "Switch learning direction")}>{learningDirections.map(d => <Link key={d.key} href={levelHref(d.key, data.courses)} aria-current={d.key === direction ? "page" : undefined}>{local(d)}</Link>)}</nav>
      {courses.length > 0 && <section className="discovery-section"><h2>{t("Доступные курсы", "Choose a course")}</h2><div className="discovery-course-grid">{courses.map(c => <Link className="discovery-course" href={(lang === "ru" ? "/ru" : "") + "/courses/" + encodeURIComponent(c.slug)} key={c.slug}><h3>{courseLabel(c.slug, local(c))} <Arrow /></h3>{c.description && <p>{c.description}</p>}<span>{c.chapters} {t("глав", "chapters")} · {c.topics} {t("тем", "topics")}</span></Link>)}</div></section>}
      {!courses.length && !data.unavailable && <section className="discovery-bridge"><h2>{t("Продолжите на основном сайте Maths4U", "Explore this course on Maths4U")}</h2><p>{t("Материалы этого направления пока находятся на основном сайте. Ссылка ведёт к существующим темам и сохраняет доступ к вашим ресурсам.", "This direction is currently available on the main Maths4U site. Open the existing topics and learning resources there.")}</p><ButtonLink className="button" href={active.key === "olympiad" ? "https://maths4u.sbs/chapter.php?id=126" : "https://maths4u.sbs/program.php?key=" + active.legacy}>{t("Открыть материалы", "Open the resources")} <Arrow external /></ButtonLink></section>}
      {sample && <section className="discovery-examples"><h2>{t("Пример урока", "Sample lesson")}</h2><div>{sampleLink(sample)}</div></section>}
      {searchForm}
    </>}
    {view === "search" && <>
      <header className="discovery-page-heading"><p className="eyebrow">{t("Найти следующий шаг", "Find your next step")}</p><h1>{t("Поиск по курсам и темам", "Search courses and topics")}</h1><p>{t("Ищите название темы или код экзамена. Результаты ведут прямо к материалам.", "Search a topic name or exam code and go straight to the learning materials.")}</p></header>
      {searchForm}
      {selectedCourses !== undefined && <nav className="discovery-switcher" aria-label="Search scope">
        <Link href={searchHref(false)} aria-current={myCourseSearch ? "page" : undefined}>My courses</Link>
        <Link href={searchHref(true)} aria-current={searchAll ? "page" : undefined}>All courses</Link>
      </nav>}
      {!data.unavailable && <section className="discovery-results" aria-labelledby="results-title"><h2 id="results-title" aria-live="polite">{search.trim() ? t(`Найдено: ${results.length}`, `${results.length} ${results.length === 1 ? "result" : "results"}`) : t("С чего начнём?", "Where shall we start?")}</h2>
        {searchEmptyState ?? <>
          <ul>{results.slice(0, limit).map(item => <li key={item.href}><Link href={item.href}>
            <span>{item.kind === "course" ? courseLabel(item.courseSlug, local(item)) : local(item)} <span aria-hidden="true">→</span></span>
            {item.kind === "topic" && <small>{courseLabel(item.courseSlug, lang === "ru" ? item.courseRu : item.course)}{item.chapter ? " · " + (lang === "ru" ? item.chapterRu : item.chapter) : ""}</small>}
          </Link></li>)}</ul>
          {results.length > limit && <Button type="button" className="secondary" onClick={() => setLimit(limit + 25)}>{t("Показать ещё", "Show more results")}</Button>}
        </>}
      </section>}{selectedCourses === undefined && directionCards}
    </>}
    {view === "teachers" && <>
      <header className="discovery-page-heading"><p className="eyebrow">{t("Для учителя", "For teachers")}</p><h1>{t("Меньше переключений. Больше времени для объяснений.", "Less switching. More time for teaching.")}</h1><p>{t("Курсы, наборы задач и обратная связь в одном учебном пространстве.", "Courses, question sets and feedback in one teaching workspace.")}</p></header>
      <div className="discovery-course-grid">{[{ title: t("Подготовить урок", "Prepare a lesson"), body: t("Выберите курс и тему. Презентации доступны в материалах темы при наличии разрешения.", "Choose a course and topic. Lesson presentations stay inside the topic resources, subject to your existing permissions.") }, { title: t("Назначить работу", "Set work"), body: t("Соберите задачи в набор, выберите класс и задайте правила сдачи.", "Build a question set, choose a class and set the submission rules.") }, { title: t("Разобрать ответы", "Review responses"), body: t("Просматривайте письменные ответы и вложения, выставляйте баллы и публикуйте результаты.", "Read written answers and attachments, award marks and release results.") }].map(s => <section className="discovery-course" key={s.title}><h2>{s.title}</h2><p>{s.body}</p></section>)}</div>
      <div className="discovery-actions"><ButtonLink className="button" href={teacher ? "/teacher" : "/register?accountType=teacher"}>{teacher ? t("Войти в кабинет учителя", "Open the teacher workspace") : t("Создать аккаунт учителя", "Create a teacher account")} →</ButtonLink><ButtonLink className="button secondary" href="/courses">{t("Посмотреть материалы", "Browse the materials")}</ButtonLink></div>{!teacher && <p className="discovery-fine">{t("Базовый аккаунт учителя: 3 активных класса и до 100 учеников. ИИ и платные материалы требуют отдельного доступа.", "Basic teacher accounts include 3 active classes and up to 100 students. AI tools and paid resources require separate access.")}</p>}
    </>}
  </div>;
}
