"use client";
import Link from "next/link";
import { useContext, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "./copy-button";
import { ActorContext, useLocale, useResource, Heading, Loading, Empty, ErrorNotice, DateLabel, Status, ActionButton, Form, Field, str, num, api } from "./ui";
import type { listWorks, workSummary, workResults } from "@/lib/works";

import type { courses } from "@/lib/courses";
import type { listOlympiads } from "@/lib/olympiads";
import type { classDetail, listClasses } from "@/lib/classrooms";
type Works = Awaited<ReturnType<typeof listWorks>>;
type CourseList = Awaited<ReturnType<typeof courses>>;

export type ClassList = Awaited<ReturnType<typeof listClasses>>;
const go = (path: string) => window.location.assign(path);

export function WorkRows({ rows, manage = false }: { rows: Works; manage?: boolean }) {
  const { t } = useLocale();
  if (!rows.length) return <Empty>{t("Новые задания появятся здесь.", "New assignments will appear here.")}</Empty>;
  return <div>{rows.map(w => <div className="item" key={w.id}><div className="row spread"><div>
    <div className="row"><Status value={w.kind} />{w.archived && <span className="badge gray">{t("Архив", "Archived")}</span>}</div>
    <h3 style={{ marginTop: 9 }}><Link href={"/works/" + w.id}>{w.title}</Link></h3>
    <div className="muted" style={{ fontSize: 12 }}>{w.classTitle && <>{w.classTitle} · </>}{t("Сдать до ", "Due ")}<DateLabel value={w.dueAt} /></div>
  </div><Link className="button secondary" href={"/works/" + w.id + (manage ? "/results" : "")}>{manage ? t("Результаты", "Results") : t("Открыть", "Open")} →</Link></div>
    {!!w.attempts.length && <div className="row" style={{ marginTop: 10 }}>{manage ? <span className="muted">{w.attempts.length} {t("попыток", "attempts")} · {w.attempts.filter(a => a.status === "SUBMITTED").length} {t("на проверке", "awaiting review")}</span>
      : w.attempts.map(a => <Link key={a.id} href={"/attempts/" + a.id}><Status value={a.status} /></Link>)}</div>}
  </div>)}</div>;
}
export function Dashboard({ manage = false }: { manage?: boolean }) {
  const { t } = useLocale(), actor = useContext(ActorContext);
  const work = useResource<Works>("works" + (manage ? "?manage=1" : ""));
  const classes = useResource<ClassList>("classes" + (manage ? "?manage=1" : ""));
  const learned = useResource<CourseList>(manage ? null : "courses");
  const olymp = useResource<Awaited<ReturnType<typeof listOlympiads>>>(manage ? null : "olympiads");
  const [all, setAll] = useState(false);
  if (work.error || classes.error) return <ErrorNotice error={work.error || classes.error} />;
  if (!work.data || !classes.data) return <Loading />;
  const upcoming = work.data.filter(w => !w.archived && new Date(w.dueAt) > new Date());
  const pending = work.data.flatMap(w => w.attempts).filter(a => a.status === "SUBMITTED").length;
  return <><Heading title={t("Здравствуйте, ", "Hello, ") + actor?.displayName.split(" ")[0] + "."} subtitle={manage ? t("Классы, задания и обратная связь — всё под рукой.", "Your classes, assignments and feedback in one place.") : t("Небольшие шаги сегодня. Большие открытия завтра.", "Small steps today. Big discoveries tomorrow.")}>
    <Link className="button" href={manage ? "/teacher/works/new" : "/library"}>{manage ? t("+ Назначить работу", "+ Assign work") : t("Перейти к практике", "Start practising")} →</Link>
  </Heading>
    <div className="grid three" style={{ marginBottom: 28 }}>{[
      [String(upcoming.length).padStart(2, "0"), t("Текущие работы", "Active assignments")],
      [String(classes.data.filter(c => !c.archivedAt).length).padStart(2, "0"), t("Мои классы", "My classes")],
      [String(pending).padStart(2, "0"), t("Ожидают проверки", "Awaiting review")],
    ].map(([value, title]) => <div className="card" key={title}><p className="muted" style={{ fontSize: 12 }}>{title}</p><div className="metric">{value}<span style={{ color: "#a9cbbb", fontSize: 22, float: "right" }}>↗</span></div></div>)}</div>
    <div className="dashboard-grid"><section className="card"><div className="row spread"><h2>{manage ? t("Работы класса", "Class assignments") : t("Ближайшие задания", "Upcoming assignments")}</h2><button className="quiet" onClick={() => setAll(!all)}>{all ? t("Текущие", "Active") : t("Все и архив", "All & archive")}</button></div>
      <WorkRows rows={all ? work.data : upcoming} manage={manage} />
      {!all && !manage && !!work.data.filter(w => w.attempts.some(a => a.status !== "IN_PROGRESS")).length && <><h2 style={{ marginTop: 32 }}>{t("Результаты и комментарии", "Results & feedback")}</h2><WorkRows rows={work.data.filter(w => w.attempts.some(a => a.status !== "IN_PROGRESS")).slice(0, 5)} /></>}
    </section><aside className="stack"><section className="card tint"><p className="eyebrow">{t("Учимся вместе", "Learning together")}</p><h2>{t("Мои классы", "My classes")}</h2>
      {!classes.data.length ? <Empty /> : classes.data.map(c => <div className="item" key={c.id}><Link href={manage ? "/teacher/classes/" + c.id : "/student"}>{c.title}</Link><div className="muted">{c._count.members} {t("учеников", "students")}</div></div>)}
      <Link className="button secondary" href={manage ? "/teacher/classes" : "/join-class"} style={{ marginTop: 20 }}>{manage ? t("Управлять классами", "Manage classes") : t("Вступить по коду", "Join with a code")}</Link></section>
      {manage ? <section className="card"><h2>{t("Подготовить урок", "Prepare a lesson")}</h2><p className="muted">{t("Добавьте свои задачи или выберите материалы из банка.", "Add your own problems or use the shared library.")}</p><div className="stack"><Link href="/teacher/tasks/new">{t("+ Новая задача", "+ New problem")}</Link><Link href="/library">{t("Открыть банк задач", "Browse the problem bank")} →</Link><Link href="/teacher/olympiads/new">{t("Создать олимпиаду", "Create an olympiad")} →</Link></div></section> :
        <section className="card"><h2>{t("Продолжить обучение", "Continue learning")}</h2>{learned.data?.flatMap(c => c.topics.flatMap(topic => topic.lessons.filter(l => l.openedAt && !l.completed).map(l => <p key={l.id}><Link href={"/courses#lesson-" + l.id}>{l.title} →</Link></p>))).slice(0, 3)}
          <Link className="button quiet" href="/courses">{t("Все курсы", "All courses")} →</Link></section>}
      {!manage && <section className="card"><h2>{t("Олимпиады", "Olympiads")}</h2>{olymp.data?.slice(0, 2).map(o => <p key={o.id}><Link href="/olympiads">{o.title} →</Link></p>)}<Link className="button quiet" href="/olympiads">{t("Расписание и участие", "Schedule & participation")} →</Link></section>}
    </aside></div></>;
}
export function Classes({ manage = false, invite }: { manage?: boolean; invite?: string }) {
  const { t } = useLocale(), r = useResource<ClassList>("classes" + (manage ? "?manage=1" : ""));
  return <><Heading title={manage ? t("Мои классы", "My classes") : t("Вступить в класс", "Join a class")} subtitle={t("Один код — и вы учитесь вместе.", "One code to start learning together.")} /><div className="grid two">
    <div className="card"><h2>{manage ? t("Новый класс", "New class") : t("Код приглашения", "Invitation code")}</h2>
      <Form label={manage ? t("Создать класс", "Create class") : t("Вступить", "Join class")} submit={async f => {
        const result = await api<{ id: string }>(manage ? "classes" : "classes/join", "POST", manage ? { title: str(f, "title") } : { code: str(f, "code").trim() });
        go(manage ? "/teacher/classes/" + result.id : "/student");
      }}><Field name={manage ? "title" : "code"} label={manage ? t("Название класса", "Class name") : t("Код от учителя", "Teacher's code")} value={invite} /></Form>
    </div><div className="card"><h2>{t("Мои классы", "My classes")}</h2><ErrorNotice error={r.error} />{r.data?.map(c => <div className="item" key={c.id}><Link href={manage ? "/teacher/classes/" + c.id : "/student"}>{c.title} →</Link>{c.archivedAt && <span className="badge gray">{t("Архив", "Archived")}</span>}</div>)}</div>
  </div></>;
}
export function ClassDetail({ id }: { id: string }) {
  const { t } = useLocale(), r = useResource<Awaited<ReturnType<typeof classDetail>>>("classes/" + id);
  if (r.error) return <ErrorNotice error={r.error} />; if (!r.data) return <Loading />;
  const c = r.data, link = typeof window === "undefined" ? "" : window.location.origin + "/join-class/" + c.joinCode;
  return <><Heading title={c.title} subtitle={t("Пригласите учеников и назначьте первую работу.", "Invite your students and assign their first work.")}><Link className="button" href={"/teacher/works/new?class=" + id}>{t("+ Назначить работу", "+ Assign work")}</Link></Heading><div className="dashboard-grid">
    <section className="card"><h2>{t("Ученики", "Students")} · {c.members.length}</h2>{!c.members.length && <Empty>{t("Передайте ученикам ссылку или QR-код справа.", "Share the link or QR code with your students.")}</Empty>}
      {c.members.map(m => <div className="item row spread" key={m.user.id}><div><strong>{m.user.displayName}</strong><p className="muted">{m.user.username}</p></div><ActionButton label={t("Исключить", "Remove")} secondary action={() => api("classes/" + id, "PATCH", { userId: m.user.id, remove: true })} onDone={r.refresh} /></div>)}
      <details style={{ marginTop: 24 }}><summary>{t("Настройки класса", "Class settings")}</summary><Form label={t("Переименовать", "Rename")} done={r.refresh} submit={f => api("classes/" + id, "PATCH", { title: str(f, "title") })}><Field label={t("Название", "Name")} name="title" value={c.title} /></Form>
        <div className="row" style={{ marginTop: 18 }}><ActionButton secondary label={c.archivedAt ? t("Восстановить класс", "Restore class") : t("Архивировать класс", "Archive class")} action={() => api("classes/" + id, "PATCH", { archive: !c.archivedAt })} onDone={r.refresh} />
        <ActionButton secondary label={t("Обновить код", "Rotate code")} action={() => api("classes/" + id, "PATCH", { rotateCode: true })} onDone={r.refresh} /></div></details></section>
    <aside className="card tint"><p className="eyebrow">{t("Приглашение", "Invitation")}</p><h2>{t("Учимся вместе", "Let's learn together")}</h2><div style={{ background: "white", padding: 20, width: "fit-content", margin: "16px auto", borderRadius: 12 }}><QRCodeSVG value={link} size={180} /></div>
      <p style={{ textAlign: "center", letterSpacing: 2, fontSize: 16, overflowWrap: "anywhere" }}>{c.joinCode}</p><p className="muted">{t("Чтобы вступить, ученику нужен свой аккаунт.", "Students need their own account to join.")}</p><CopyButton value={link} label={t("Скопировать ссылку", "Copy invite link")} /></aside>
  </div></>;
}
export function WorkPage({ id }: { id: string }) {
  const { t } = useLocale(), r = useResource<Awaited<ReturnType<typeof workSummary>>>("works/" + id);
  if (r.error) return <ErrorNotice error={r.error} />; if (!r.data) return <Loading />;
  const w = r.data, v = w.version;
  return <><Heading title={w.title} subtitle={w.classTitle ?? t("Учитесь в своём темпе.", "Learn at your own pace.")} /><section className="card" style={{ maxWidth: 760 }}><Status value={w.kind} />
    <div className="grid two" style={{ margin: "22px 0" }}><div><p className="muted">{t("Открытие", "Opens")}</p><DateLabel value={v.opensAt} /></div><div><p className="muted">{t("Дедлайн", "Deadline")}</p><DateLabel value={v.dueAt} /></div>
      <div><p className="muted">{t("Задач", "Problems")}</p><strong>{v._count.items}</strong></div><div><p className="muted">{t("Время / попытки", "Time / attempts")}</p><strong>{v.timeLimitSeconds ? v.timeLimitSeconds / 60 + t(" мин.", " min.") : t("До дедлайна", "Until the deadline")} / {v.attemptsAllowed}</strong></div></div>
    <p className="notice">{t("После начала время отсчитывается на сервере. Ответы сохраняются автоматически. После завершения времени будут учтены только сохранённые ответы.", "The server timer starts when you begin. Answers are saved automatically. When time expires, only saved answers are counted.")}</p>
    <p className="muted">{t("Результаты: ", "Results: ")}{v.resultPolicy === "MANUAL" ? t("после публикации учителем", "after the teacher publishes them") : v.resultPolicy === "AFTER_DEADLINE" ? t("после дедлайна", "after the deadline") : t("после сдачи", "after submission")}</p>
    {w.manager ? <Link className="button" href={"/works/" + id + "/results"}>{t("Результаты и проверка", "Results & review")}</Link> : <div className="stack">
      {v.attempts.map(a => <div className="row spread item" key={a.id}><div>{t("Попытка ", "Attempt ")}{a.number} · <Status value={a.status} /></div><Link className="button secondary" href={"/attempts/" + a.id}>{a.status === "IN_PROGRESS" ? t("Продолжить", "Continue") : t("Открыть результат", "View result")}</Link></div>)}
      {!w.archived && !v.attempts.some(a => a.status === "IN_PROGRESS") && v.attempts.length < v.attemptsAllowed && <ActionButton label={v.attempts.length ? t("Новая попытка", "New attempt") : t("Начать работу", "Start work")} action={async () => { const a = await api<{ id: string }>("works/" + id + "/start", "POST", { newAttempt: v.attempts.length > 0 }); go("/attempts/" + a.id); }} />}
    </div>}
  </section></>;
}
export function ResultsPage({ id }: { id: string }) {
  const { t } = useLocale(), r = useResource<Awaited<ReturnType<typeof workResults>>>("works/" + id + "/results"), summary = useResource<Awaited<ReturnType<typeof workSummary>>>("works/" + id);
  return <><Heading title={summary.data?.title ?? t("Результаты", "Results")} subtitle={t("Проверьте решения и опубликуйте обратную связь.", "Review solutions and publish feedback.")}><a className="button secondary" href={"/api/works/" + id + "/export"}>{t("Скачать CSV", "Download CSV")}</a></Heading><ErrorNotice error={r.error} />
    <div className="card"><div className="row spread" style={{ marginBottom: 20 }}><h2>{t("Работы учеников", "Student submissions")}</h2><ActionButton label={summary.data?.resultsPublished ? t("Результаты опубликованы", "Results published") : t("Опубликовать результаты", "Publish results")} action={() => api("works/" + id + "/publish-results", "POST")} onDone={summary.refresh} /></div>
    <div className="table-scroll"><table className="data"><thead><tr><th>{t("Ученик", "Student")}</th><th>{t("Попытка", "Attempt")}</th><th>{t("Статус", "Status")}</th><th>{t("Баллы", "Score")}</th><th /></tr></thead><tbody>{r.data?.map(a => <tr key={a.id}><td><strong>{a.student.displayName}</strong><div className="muted">{a.student.username}</div></td><td>{a.number}</td><td><Status value={a.status} /></td><td>{a.score} / {a.maxPoints}</td><td><Link className="button secondary" href={"/attempts/" + a.id + "/review"}>{t("Проверить", "Review")}</Link></td></tr>)}</tbody></table></div>
    {r.data && !r.data.length && <Empty>{t("Ученики ещё не начали работу.", "No students have started yet.")}</Empty>}</div><div style={{ marginTop: 24 }}><ActionButton secondary label={t("Архивировать работу", "Archive work")} action={() => api("works/" + id + "/archive", "POST")} onDone={() => go("/teacher")} /></div></>;
}
export function Olympiads() {
  const { t } = useLocale(), actor = useContext(ActorContext), r = useResource<Awaited<ReturnType<typeof listOlympiads>>>("olympiads");
  const [results, setResults] = useState<{ participant: string; score: number; round: number }[] | null>(null);
  return <><Heading title={t("Олимпиады", "Olympiads")} subtitle={t("Время подумать. Место для красивых решений.", "Time to think. A place for elegant solutions.")}>
    {actor?.roles.some(r => ["ADMIN", "TEACHER"].includes(r.role)) && <Link className="button" href="/teacher/olympiads/new">{t("+ Создать олимпиаду", "+ Create olympiad")}</Link>}</Heading>
    <ErrorNotice error={r.error} />{!r.data ? <Loading /> : !r.data.length ? <Empty /> : <div className="grid two">{r.data.map(o => <section className="card" key={o.id}><span className="badge gold">{o.registered ? t("Вы зарегистрированы", "You are registered") : t("Олимпиада", "Olympiad")}</span><h2 style={{ marginTop: 16 }}>{o.title}</h2><p className="muted">{t("Регистрация до ", "Register by ")}<DateLabel value={o.registrationClosesAt} /></p>
      {!o.registered && <Form label={t("Зарегистрироваться", "Register")} done={r.refresh} submit={f => api("olympiads/" + o.id + "/register", "POST", { groupId: str(f, "groupId"), age: num(f, "age") })}>
        <div className="field-grid"><label>{t("Группа", "Group")}<select name="groupId">{o.groups.map(g => <option value={g.id} key={g.id}>{g.title} ({g.minAge}–{g.maxAge})</option>)}</select></label><Field type="number" name="age" label={t("Полных лет", "Age in years")} min={5} max={99} /></div></Form>}
      {o.rounds.map(round => <div className="item" key={round.workId}><h3>{round.title}</h3><p className="muted"><DateLabel value={round.opensAt} /> — <DateLabel value={round.dueAt} /></p><div className="row">
        {o.registered && <Link className="button secondary" href={"/works/" + round.workId}>{t("Открыть тур", "Open round")} →</Link>}{o.manager && <Link className="button secondary" href={"/works/" + round.workId + "/results"}>{t("Проверка", "Review")}</Link>}
        {round.resultsPublished && <ActionButton secondary label={t("Итоги", "Standings")} action={async () => setResults(await api("olympiads/" + o.id + "/results"))} />}</div></div>)}
    </section>)}</div>}
    {results && <section className="card" style={{ marginTop: 24 }}><h2>{t("Опубликованные результаты", "Published results")}</h2>{results.map((r, i) => <div className="item row spread" key={i}><span>{r.participant} · {t("Тур", "Round")} {r.round}</span><strong>{r.score}</strong></div>)}</section>}</>;
}
export function MyAccess() {
  const { t } = useLocale(), r = useResource<Array<{ id: string; status: string; startsAt: string; endsAt: string; plan: { name: string; features: { feature: { title: string } }[] } }>>("subscriptions");
  return <><Heading title={t("Мой доступ", "My access")} subtitle={t("Школьные задания доступны без личной подписки. Доступ к дополнительным материалам выдаёт администратор.", "Class assignments do not require a personal subscription. An administrator can grant access to additional materials.")} />
    <ErrorNotice error={r.error} /><div className="grid two">{r.data?.map(s => <div className="card" key={s.id}><h2>{s.plan.name}</h2><p>{s.status === "ACTIVE" && new Date(s.endsAt) > new Date() && new Date(s.startsAt) <= new Date() ? t("Действует", "Active") : t("Не действует", "Inactive")}</p><p className="muted">{t("До ", "Until ")}<DateLabel value={s.endsAt} /></p>{s.plan.features.map(f => <p key={f.feature.title}>{f.feature.title}</p>)}</div>)}</div>{r.data?.length === 0 && <Empty>{t("Дополнительный доступ пока не выдан.", "No additional access has been granted yet.")}</Empty>}</>;
}
