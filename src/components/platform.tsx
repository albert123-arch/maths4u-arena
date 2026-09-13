"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication changes discard account-specific client state with a full navigation. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Actor } from "@/lib/security";
import { api, LocaleContext, ActorContext, useLocale, Form, Field, str, Heading, ErrorNotice, Loading } from "./ui";
import { Dashboard, Classes, ClassDetail, Olympiads, WorkPage, ResultsPage, MyAccess } from "./screens";
import { WorkEditor, TaskEditor, OlympiadEditor } from "./editors";
import { AttemptScreen } from "./attempt-screen";
import { TaskBasketProvider } from "./task-basket";
import { CatalogScreen, CourseCatalogScreen, TopicScreen } from "./catalog-screen";
import { StructureEditor } from "./structure-editor";
import { AdminScreen } from "./admin-screen";

export function Platform() {
  const path = usePathname(), parts = path.split("/").filter(Boolean);
  const [actor, setActor] = useState<Actor | null>(null), [ready, setReady] = useState(false), [lang, setLang] = useState<"ru" | "en">("ru");
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    api<{ user: Actor | null }>("auth/me").then(({ user }) => {
      setActor(user); const stored = localStorage.getItem("maths4u_locale");
      setLang(stored === "en" || stored === "ru" ? stored : user?.profile?.locale ?? "ru");
    }).catch(setError).finally(() => setReady(true));
  }, []);
  const t = (ru: string, en: string) => lang === "ru" ? ru : en;
  const admin = actor?.roles.some(r => r.role === "ADMIN"), teacher = admin || actor?.roles.some(r => r.role === "TEACHER");
  const publicPage = !parts.length || ["login", "register", "recover", "library", "courses"].includes(parts[0]);
  let content;
  if (!ready) content = <Loading />;
  else if (error) content = <ErrorNotice error={error} />;
  else if (!publicPage && !actor) content = <Auth mode="login" next={path} />;
  else if (parts[0] === "admin" && !admin || parts[0] === "teacher" && !teacher) content = <div className="notice error">{t("Этот раздел недоступен вашему аккаунту.", "This section is not available to your account.")}</div>;
  else if (!parts.length) content = <Home actor={actor} teacher={!!teacher} />;
  else if (["login", "register", "recover"].includes(parts[0])) content = <Auth mode={parts[0]} />;
  else if (parts[0] === "library") content = <CatalogScreen />;
  else if (parts[0] === "courses") content = parts[2] === "topics" && parts[3] ? <TopicScreen id={parts[3]} /> : <CourseCatalogScreen slug={parts[1]} />;
  else if (parts[0] === "attempts" && parts[1]) content = <AttemptScreen id={parts[1]} review={parts[2] === "review"} />;
  else if (parts[0] === "works" && parts[1]) content = parts[2] === "results" ? <ResultsPage id={parts[1]} /> : <WorkPage id={parts[1]} />;
  else if (parts[0] === "join-class") content = <Classes invite={parts[1]} />;
  else if (parts[0] === "olympiads") content = <Olympiads />;
  else if (parts[0] === "access") content = <MyAccess />;
  else if (parts[0] === "teacher" && parts[1] === "classes") content = parts[2] ? <ClassDetail id={parts[2]} /> : <Classes manage />;
  else if (parts[0] === "teacher" && parts[1] === "works" && parts[2] === "new") content = <WorkEditor />;
  else if (parts[0] === "teacher" && parts[1] === "tasks") content = <TaskEditor id={parts[2] === "new" ? undefined : parts[2]} />;
  else if (parts[0] === "teacher" && parts[1] === "olympiads") content = <OlympiadEditor />;
  else if (parts[0] === "admin" && parts[1] === "courses") content = <StructureEditor />;
  else if (parts[0] === "admin") content = <AdminScreen section={parts[1] ?? "overview"} />;
  else if (["student", "teacher"].includes(parts[0])) content = <Dashboard manage={parts[0] === "teacher"} />;
  else content = <div className="card"><h1>404</h1><Link href="/">{t("На главную", "Go home")}</Link></div>;
  return <LocaleContext.Provider value={lang}><ActorContext.Provider value={actor}><TaskBasketProvider key={actor?.id ?? "guest"}>
    <header className="topbar"><div className="topbar-inner">
      <Link className="brand" href="/"><span className="brand-symbol">m</span>Maths4U<span className="badge gray">BETA</span></Link>
      <nav className="nav" aria-label={t("Основная навигация", "Main navigation")}>
        {actor && <Link className={path === "/student" ? "active" : ""} href="/student">{t("Моё обучение", "My learning")}</Link>}
        <Link className={path === "/courses" ? "active" : ""} href="/courses">{t("Курсы", "Courses")}</Link>
        <Link className={path === "/library" ? "active" : ""} href="/library">{t("Задачи", "Problems")}</Link>
        <Link href="/olympiads">{t("Олимпиады", "Olympiads")}</Link>
        {teacher && <Link className={parts[0] === "teacher" ? "active" : ""} href="/teacher">{t("Учителю", "Teaching")}</Link>}
        {admin && <Link className={parts[0] === "admin" ? "active" : ""} href="/admin">{t("Управление", "Admin")}</Link>}
      </nav>
      <div className="account"><div className="locale">{(["ru", "en"] as const).map(l => <button key={l} className={lang === l ? "selected" : ""} aria-pressed={lang === l} onClick={() => {
        setLang(l); localStorage.setItem("maths4u_locale", l); document.documentElement.lang = l;
        if (actor) void api("profile", "PATCH", { locale: l }).catch(() => {});
      }}>{l.toUpperCase()}</button>)}</div>
      {actor ? <><Link className="account-name" href="/access">{actor.displayName}</Link><button className="quiet" onClick={async () => { await api("auth/logout", "POST"); window.location.assign("/login"); }}>{t("Выйти", "Sign out")}</button></> : <Link href="/login">{t("Войти", "Sign in")} ↗</Link>}</div>
    </div></header>
    <main className="container" key={path}>{content}</main>
    <footer className="footer"><span>© Maths4U · {t("Математика объединяет", "Mathematics brings us together")}</span><Link href="/recover">{t("Помощь со входом", "Account help")}</Link></footer>
  </TaskBasketProvider></ActorContext.Provider></LocaleContext.Provider>;
}
function Home({ actor, teacher }: { actor: Actor | null; teacher: boolean }) {
  const { t } = useLocale();
  return <><section className="hero"><div className="hero-copy"><p className="eyebrow">{t("Каждая задача — шаг вперёд", "Every problem is a step forward")}</p>
    <h1>{t("Математика,\nкоторая понятна.", "Mathematics.\nMade understandable.")}</h1>
    <p className="muted">{t("От первого доказательства до олимпиадной задачи. Учитесь, практикуйтесь и получайте обратную связь в одном месте.", "From your first proof to an olympiad challenge. Learn, practise and receive feedback in one place.")}</p>
    <div className="row"><Link className="button" href={actor ? teacher ? "/teacher" : "/student" : "/register"}>{actor ? t("Открыть кабинет", "Open dashboard") : t("Начать обучение", "Start learning")} →</Link><Link className="button secondary" href="/courses">{t("Посмотреть курсы", "Explore courses")}</Link></div>
    </div><div className="math-art" aria-hidden="true"><span className="hero-number">∞</span><div className="math-orbit"><div className="formula">a² + b² = c²</div></div><span className="hero-note">EXPLORE · THINK · UNDERSTAND</span></div></section>
    <div className="grid three">{[
      [t("01 / Учиться", "01 / Learn"), t("Теория с примерами", "Theory with examples"), t("Курсы, формулы и материалы на русском и английском.", "Courses, formulas and materials in Russian and English."), "/courses"],
      [t("02 / Решать", "02 / Solve"), t("Практика каждый день", "Everyday practice"), t("Общий банк задач для самостоятельной работы и уроков.", "A shared problem bank for independent learning and classroom work."), "/library"],
      [t("03 / Расти", "03 / Grow"), t("Обратная связь", "Feedback that helps"), t("Задания учителя, проверка решений и участие в олимпиадах.", "Teacher assignments, reviewed solutions and olympiad participation."), "/student"],
    ].map(([label, title, desc, href]) => <Link className="card" href={href} key={href}><p className="eyebrow">{label}</p><h2>{title} ↗</h2><p className="muted">{desc}</p></Link>)}</div>
  </>;
}
function Auth({ mode, next }: { mode: string; next?: string }) {
  const { t, lang } = useLocale();
  const register = mode === "register", recovery = mode === "recover";
  return <section className="form-narrow"><Heading title={recovery ? t("Восстановить доступ", "Recover your account") : register ? t("Добро пожаловать", "Welcome to Maths4U") : t("С возвращением", "Welcome back")}
    subtitle={t("Один аккаунт для всего обучения.", "One account for all your learning.")} /><div className="card">
    {recovery && <p className="notice">{t("Сообщите школьному администратору свой логин. После проверки личности он выдаст одноразовый код на 60 минут. Личная почта не нужна.", "Tell your school administrator your login. After verifying your identity, they will issue a one-time code valid for 60 minutes. No personal email is required.")}</p>}
    <Form label={recovery ? t("Сменить пароль", "Reset password") : register ? t("Создать аккаунт", "Create account") : t("Войти", "Sign in")} submit={async f => {
      if (recovery) { await api("auth/recover", "POST", { token: str(f, "token"), password: str(f, "password") }); window.location.assign("/login"); return; }
      if (register) await api("auth/register", "POST", { username: str(f, "username"), password: str(f, "password"), displayName: str(f, "displayName"), locale: lang, ...(str(f, "email") ? { email: str(f, "email") } : {}) });
      const user = await api<Actor>("auth/login", "POST", { username: str(f, "username"), password: str(f, "password") });
      const intended = next ?? new URLSearchParams(window.location.search).get("next");
      const safe = intended && /^\/(?!\/|\\)/.test(intended) ? intended : user.roles.some(r => r.role === "ADMIN") ? "/admin" : user.roles.some(r => r.role === "TEACHER") ? "/teacher" : "/student";
      window.location.assign(safe);
    }}>
      {register && <Field name="displayName" label={t("Имя и фамилия", "Full name")} />}
      {recovery ? <Field name="token" label={t("Код от администратора", "Administrator recovery code")} /> : <label>{t("Логин", "Login")}<input aria-label={t("Логин", "Login")} name="username" autoComplete="username" required pattern="[a-zA-Z0-9_.\-]{3,64}" /><span className="muted">{t("От 3 символов: латинские буквы, цифры, точка, дефис.", "3 or more characters: letters, numbers, dots or hyphens.")}</span></label>}
      <label>{recovery ? t("Новый пароль", "New password") : t("Пароль", "Password")}<input aria-label={recovery ? t("Новый пароль", "New password") : t("Пароль", "Password")} name="password" type="password" required minLength={register || recovery ? 10 : 1} maxLength={72} autoComplete={register || recovery ? "new-password" : "current-password"} />{(register || recovery) && <span className="muted">{t("Не менее 10 символов.", "At least 10 characters.")}</span>}</label>
      {register && <Field name="email" label={t("Почта (необязательно)", "Email (optional)")} type="email" required={false} />}
    </Form>
    <div className="row spread" style={{ marginTop: 22 }}><Link className="button quiet" href={register ? "/login" : "/register"}>{register ? t("Уже есть аккаунт", "Already have an account") : t("Зарегистрироваться", "Create an account")}</Link>{!recovery && <Link href="/recover" className="muted">{t("Забыли пароль?", "Forgot password?")}</Link>}</div>
  </div></section>;
}
