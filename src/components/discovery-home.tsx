"use client";
import Link from "next/link";
import { useContext, useState } from "react";
import { ActorContext, useLocale } from "./ui";
import { Pure1Review } from "./pure1-review";
import { SquareReviewCard } from "./square-progress";
import { quadraticTopics } from "@/lib/square-model";
import { learningDirections, searchDiscovery, type DiscoveryData, type DirectionKey } from "@/lib/discovery-model";

export type DiscoveryProps = { data: DiscoveryData; view: "home" | "direction" | "search" | "teachers"; direction?: DirectionKey; query?: string };
const Arrow = () => <span aria-hidden="true">↗</span>;
export function DiscoveryHome({ data, view, direction, query = "", sessionReady = false }: DiscoveryProps & { sessionReady?: boolean }) {
  const { lang, t } = useLocale(), actor = useContext(ActorContext);
  const [search, setSearch] = useState(query), [limit, setLimit] = useState(25);
  const local = <T extends { title: string; ru: string }>(row: T) => lang === "ru" ? row.ru : row.title;
  const active = learningDirections.find(d => d.key === direction);
  const courses = data.courses.filter(c => c.direction === direction);
  const featured = data.items.find(i => i.kind === "topic" && i.direction === "a-level" && /^completing the square\b/i.test(i.title));
  const hasPure1 = data.courses.some(c => c.slug === "maths4u-9709-p1");
  const teacher = actor?.roles.some(r => r.role === "ADMIN" || r.role === "TEACHER");
  const results = view === "search" ? searchDiscovery(data.items, search) : [];
  const searchForm = <form className="discovery-search" action="/search" method="get" role="search" aria-label={t("Поиск по курсам и темам", "Search courses and topics")}>
    <label htmlFor="discovery-q">{t("Какую тему вы хотите изучить?", "What would you like to learn?")}</label>
    <div><input id="discovery-q" name="q" type="search" value={search} maxLength={120} onChange={e => { setSearch(e.target.value); setLimit(25); }} placeholder={t("Например: quadratics, 9709, matrices", "Try quadratics, 9709 or matrices")} /><button type="submit">{t("Найти", "Search")} <Arrow /></button></div>
  </form>;
  const directionCards = <section className="discovery-section" id="learning-directions" aria-labelledby="directions-title">
    <div className="discovery-section-heading"><div><p className="eyebrow">{t("От школы до углублённой математики", "From foundations to further mathematics")}</p><h2 id="directions-title">{t("Выберите своё направление", "Find your course")}</h2></div><Link href="/courses">{t("Все доступные курсы", "All available courses")} →</Link></div>
    <div className="discovery-directions">{learningDirections.map((d, index) => { const available = data.courses.filter(c => c.direction === d.key); return <Link className="discovery-direction" href={"/learn/" + d.key} key={d.key}>
      <div className="discovery-card-top"><span className="discovery-direction-number" aria-hidden="true">0{index + 1}</span><span className="discovery-course-code">{d.code}</span><Arrow /></div>
      <h3>{local(d)}</h3><p>{lang === "ru" ? d.descriptionRu : d.description}</p>
      <span className="discovery-card-bottom">{available.length ? t(`${available.length} ${available.length === 1 ? "курс" : "курса"} в платформе`, `${available.length} ${available.length === 1 ? "course" : "courses"} available here`) : t("Открыть материалы Maths4U", "Explore Maths4U resources")} <span aria-hidden="true">→</span></span>
    </Link>; })}</div>
  </section>;
  return <div className="discovery">
    {view === "home" && !actor && hasPure1 && <>{quadraticTopics.map(topic=><SquareReviewCard key={topic.key} topic={topic} sessionReady={sessionReady} />)}</>}
    {data.unavailable && <p className="notice" role="alert">{t("Каталог временно недоступен. Вы можете открыть материалы на основном сайте.", "The course catalogue is temporarily unavailable. You can still open the resources on the main site.")} <a href="https://maths4u.sbs/">Maths4U →</a></p>}
    {view === "home" && <>
      <section className="discovery-hero" aria-labelledby="discovery-title"><div><p className="eyebrow">{t("Математика, которая становится понятной", "Make sense of mathematics")}</p><h1 id="discovery-title">{t("Понять метод.\nУверенно решить задачу.", "Understand the method.\nSolve with confidence.")}</h1>
        <p className="discovery-lead">{t("Понятные объяснения, разобранные примеры и практика по вашей программе. Выберите тему и начните с того, что нужно сейчас.", "Clear explanations, worked examples and practice for your course. Find the topic you need and take the next step.")}</p>
        <div className="discovery-actions"><a className="button" href="#learning-directions">{t("Выбрать курс", "Find my course")} →</a>{featured && <Link className="discovery-text-link" href={featured.href}>{t("Попробовать урок", "Explore a lesson")} <Arrow /></Link>}</div>
        <p className="discovery-fine">{t("Изучать материалы можно без регистрации.", "Explore the learning materials without an account.")}</p></div>
        <aside className="discovery-route" aria-label={t("Учебный маршрут", "Your learning route")}><p className="eyebrow">{t("Один понятный маршрут", "A clear way forward")}</p><ol><li><span>01</span><div><strong>{t("Разобраться", "Understand")}</strong><p>{t("Прочитайте объяснение и разберите пример.", "Read the explanation. Follow a worked example.")}</p></div></li><li><span>02</span><div><strong>{t("Потренироваться", "Practise")}</strong><p>{t("Попробуйте сами и сравните свой метод с решением.", "Try it yourself. Compare your method with the solution.")}</p></div></li><li><span>03</span><div><strong>{t("Вернуться к сложному", "Build confidence")}</strong><p>{t("Разберите ошибки и вернитесь к нужным навыкам.", "Review mistakes and revisit the skills you need.")}</p></div></li></ol></aside>
        <details className="discovery-mobile-route"><summary>{t("Как построено обучение", "How the learning works")}</summary><p>{t("Разберите пример, попробуйте задачу сами и вернитесь к навыкам, которые требуют повторения.", "Follow a worked example, try a question yourself, then revisit the skills that need practice.")}</p></details>
      </section>
      {searchForm}
      {actor && <section className="discovery-personal"><div><p className="eyebrow">{t("Продолжить обучение", "Pick up where you left off")}</p><h2>{t("Ваше обучение", "Your learning")}</h2></div><Link className="button secondary" href={teacher ? "/teacher" : "/student"}>{t("Открыть кабинет", "Open my dashboard")} →</Link></section>}
      {actor && hasPure1 && <Pure1Review />}
      {directionCards}
      {featured && <section className="discovery-featured"><div><p className="eyebrow">9709 · Pure Mathematics 1</p><h2>{t("Начните с выделения полного квадрата", "Start with completing the square")}</h2><p>{t("Свяжите алгебру с графиком: полезная форма, вершина и корни.", "Connect algebra with the graph: a useful form, a turning point and roots.")}</p></div><Link className="button" href={featured.href}>{t("Открыть урок", "Open the lesson")} →</Link></section>}
      <section className="discovery-teacher"><div><p className="eyebrow">{t("Для учителя", "For teachers")}</p><h2>{t("От темы урока — к работе класса", "From the lesson to your classroom")}</h2><p>{t("Подбирайте задачи, назначайте работы и просматривайте ответы учеников в одном месте.", "Choose questions, set work and review your students’ responses in one place.")}</p></div><Link className="button secondary" href={teacher ? "/teacher" : "/for-teachers"}>{teacher ? t("Открыть кабинет учителя", "Open teacher tools") : t("Посмотреть инструменты", "Explore the teaching tools")} →</Link></section>
    </>}
    {view === "direction" && active && <>
      <nav className="discovery-breadcrumb" aria-label="Breadcrumb"><Link href="/">Maths4U</Link><span aria-hidden="true">/</span><span>{local(active)}</span></nav>
      <header className="discovery-page-heading"><p className="eyebrow">{active.code}</p><h1>{local(active)}</h1><p>{lang === "ru" ? active.descriptionRu : active.description}</p></header>
      <nav className="discovery-switcher" aria-label={t("Сменить направление", "Switch learning direction")}>{learningDirections.map(d => <Link key={d.key} href={"/learn/" + d.key} aria-current={d.key === direction ? "page" : undefined}>{local(d)}</Link>)}</nav>
      {courses.length > 0 && <section className="discovery-section"><h2>{t("Доступные курсы", "Choose a course")}</h2><div className="discovery-course-grid">{courses.map(c => <Link className="discovery-course" href={"/courses/" + encodeURIComponent(c.slug)} key={c.slug}><h3>{local(c)} <Arrow /></h3><p>{c.description}</p><span>{c.chapters} {t("глав", "chapters")} · {c.topics} {t("тем", "topics")}</span></Link>)}</div></section>}
      {!courses.length && !data.unavailable && <section className="discovery-bridge"><h2>{t("Продолжите на основном сайте Maths4U", "Explore this course on Maths4U")}</h2><p>{t("Материалы этого направления пока находятся на основном сайте. Ссылка ведёт к существующим темам и сохраняет доступ к вашим ресурсам.", "This direction is currently available on the main Maths4U site. Open the existing topics and learning resources there.")}</p><a className="button" href={active.key === "olympiad" ? "https://maths4u.sbs/chapter.php?id=126" : "https://maths4u.sbs/program.php?key=" + active.legacy}>{t("Открыть материалы", "Open the resources")} <Arrow /></a></section>}
      {searchForm}
    </>}
    {view === "search" && <>
      <header className="discovery-page-heading"><p className="eyebrow">{t("Найти следующий шаг", "Find your next step")}</p><h1>{t("Поиск по курсам и темам", "Search courses and topics")}</h1><p>{t("Ищите название темы или код экзамена. Результаты ведут прямо к материалам.", "Search a topic name or exam code and go straight to the learning materials.")}</p></header>
      {searchForm}
      {!data.unavailable && <section className="discovery-results" aria-labelledby="results-title"><h2 id="results-title" aria-live="polite">{search.trim() ? t(`Найдено: ${results.length}`, `${results.length} ${results.length === 1 ? "result" : "results"}`) : t("С чего начнём?", "Where shall we start?")}</h2>
        {!search.trim() ? <p>{t("Попробуйте: quadratics, functions, matrices или 9709.", "Try quadratics, functions, matrices or 9709.")}</p> : results.length === 0 ? <p>{t("Совпадений нет. Попробуйте более короткий запрос или выберите направление ниже.", "No matching topics. Try a shorter search or choose a learning direction below.")}</p> : <><ul>{results.slice(0, limit).map(i => <li key={i.href}><Link href={i.href}><span>{local(i)} <span aria-hidden="true">→</span></span><small>{lang === "ru" ? i.courseRu : i.course}{i.chapter ? " · " + (lang === "ru" ? i.chapterRu : i.chapter) : ""}</small></Link></li>)}</ul>{results.length > limit && <button type="button" className="secondary" onClick={() => setLimit(limit + 25)}>{t("Показать ещё", "Show more results")}</button>}</>}
      </section>}{directionCards}
    </>}
    {view === "teachers" && <>
      <header className="discovery-page-heading"><p className="eyebrow">{t("Для учителя", "For teachers")}</p><h1>{t("Меньше переключений. Больше времени для объяснений.", "Less switching. More time for teaching.")}</h1><p>{t("Курсы, наборы задач и обратная связь в одном учебном пространстве.", "Courses, question sets and feedback in one teaching workspace.")}</p></header>
      <div className="discovery-course-grid">{[{ title: t("Подготовить урок", "Prepare a lesson"), body: t("Выберите курс и тему. Презентации доступны в материалах темы при наличии разрешения.", "Choose a course and topic. Lesson presentations stay inside the topic resources, subject to your existing permissions.") }, { title: t("Назначить работу", "Set work"), body: t("Соберите задачи в набор, выберите класс и задайте правила сдачи.", "Build a question set, choose a class and set the submission rules.") }, { title: t("Разобрать ответы", "Review responses"), body: t("Просматривайте письменные ответы и вложения, выставляйте баллы и публикуйте результаты.", "Read written answers and attachments, award marks and release results.") }].map(s => <section className="discovery-course" key={s.title}><h2>{s.title}</h2><p>{s.body}</p></section>)}</div>
      <div className="discovery-actions"><Link className="button" href={teacher ? "/teacher" : "/login?next=%2Fteacher"}>{t("Войти в кабинет учителя", "Open the teacher workspace")} →</Link><Link className="button secondary" href="/courses">{t("Посмотреть материалы", "Browse the materials")}</Link></div>{!teacher && <p className="discovery-fine">{t("Права учителя выдаёт администратор Maths4U.", "Teacher access is granted by the Maths4U administrator.")}</p>}
    </>}
  </div>;
}
