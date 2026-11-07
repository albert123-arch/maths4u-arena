"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Discard account state on logout. */
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Actor } from "@/lib/security";
import type { Locale } from "@/lib/locale";
import { api, useLocale, useResource } from "./ui";
import { Button, Input } from "./controls";
import { ThemePicker } from "./theme-picker";
import type { LanguagePair } from "@/lib/public-page-model";
import { ViewBanner } from "./view-controls";
import { useView } from "./view-state";
import type { ViewLens } from "@/lib/request-view";

export function SiteHeader({ actor, path, hidden, publicPage, languagePair, accountLanguage, changeLanguage, viewChanged }: { actor: Actor | null; path: string; hidden: boolean; publicPage: boolean; languagePair?: LanguagePair; accountLanguage: Locale; changeLanguage: (lang: Locale) => void; viewChanged: (lens: ViewLens | null) => void }) {
  const lens = useView();
  const { lang, t: translate } = useLocale(), [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null), toggle = useRef<HTMLButtonElement>(null), account = useRef<HTMLDetailsElement>(null);
  const admin = actor?.roles.some(r => r.role === "ADMIN"), teacher = admin || actor?.roles.some(r => r.role === "TEACHER");
  const student = !!actor && !teacher;
  const staff = !!teacher && (!admin || path.startsWith('/teacher') || path.startsWith('/works') || path.startsWith('/attempts'));
  const marking = useResource<{ pendingCount: number }>(staff ? 'dashboard/teacher/counts' : null);
  const t = (ru: string, en: string) => student || staff ? en : translate(ru, en);
  const refreshMarking=marking.refresh;
  useEffect(()=>{if(!staff)return;const refresh=()=>refreshMarking();window.addEventListener('arena:marking-updated',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('arena:marking-updated',refresh);window.removeEventListener('focus',refresh);};},[staff,refreshMarking]);
  const hash = useSyncExternalStore(callback => { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); }, () => window.location.hash, () => "");
  const dashboardPath = path === "/" || path === "/student";
  const initials = actor?.displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();
  function close() { setOpen(false); if (account.current) account.current.open = false; }
  useEffect(() => {
    function key(e: KeyboardEvent) { if (e.key !== "Escape") return; if (account.current?.open) { account.current.open = false; account.current.querySelector("summary")?.focus(); } else if (toggle.current?.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.current.focus(); } }
    function outside(e: PointerEvent) { if (!root.current?.contains(e.target as Node)) { setOpen(false); if (account.current) account.current.open = false; } }
    document.addEventListener("keydown", key); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, []);
  function languages(className: string) { return publicPage && languagePair ? <div className={`locale ${className}`} aria-label={t("Язык страницы", "Page language")}>{(["en", "ru"] as const).map(value => <Link key={value} href={languagePair[value]} aria-current={lang === value ? "page" : undefined}>{value.toUpperCase()}</Link>)}</div> : null; }
  return <header className="topbar" data-student={student || undefined} data-teacher={staff || undefined} hidden={hidden} ref={root}><ViewBanner changed={viewChanged} /><div className="topbar-inner">
    <Link className="brand" href="/" onClick={close}><span className="brand-symbol" aria-hidden="true">m</span>Maths4U<span className="badge beta-badge">BETA</span></Link>
    <Button variant="text" className="mobile-nav-toggle" ref={toggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => { setOpen(v => !v); if (account.current) account.current.open = false; }}><span aria-hidden="true">{open ? "×" : "☰"}</span>{t("Меню", "Menu")}</Button>
    <nav id="site-navigation" className="nav" data-open={open} aria-label={t("Основная навигация", "Main navigation")}>
      {student ? <>
        <Link aria-current={dashboardPath && !hash ? "page" : undefined} href="/student" onClick={close}>Dashboard</Link>
        <Link aria-current={path.startsWith("/courses") ? "page" : undefined} href="/courses" onClick={close}>Courses</Link>
        <Link aria-current={path === "/student/review" || dashboardPath && hash === "#review" ? "page" : undefined} href="/student/review" onClick={close}>Review</Link>
        <Link aria-current={path === "/student/assignments" ? "page" : undefined} href="/student/assignments" onClick={close}>Assignments</Link>
        <Link aria-current={path === "/student/notebook" || dashboardPath && hash === "#mistake-notebook" ? "page" : undefined} href="/student/notebook" onClick={close}>Notebook</Link>
      </> : staff ? <>
        <Link aria-current={path === '/teacher' || path === '/' ? 'page' : undefined} href="/teacher" onClick={close}>Dashboard</Link>
        <Link aria-current={path.startsWith('/teacher/classes') ? 'page' : undefined} href="/teacher/classes" onClick={close}>Classes</Link>
        <Link aria-current={path.startsWith('/teacher/assignments') || path.startsWith('/teacher/works') || path.startsWith('/works') ? 'page' : undefined} href="/teacher/assignments" onClick={close}>Assignments</Link>
        <Link aria-current={path.startsWith('/teacher/marking') || path.startsWith('/attempts') ? 'page' : undefined} href="/teacher/marking" onClick={close}>Marking{(marking.data?.pendingCount ?? 0) > 0 && <span className="teacher-marking-badge" aria-label={marking.data!.pendingCount+' awaiting marking'}>{marking.data!.pendingCount}</span>}</Link>
        <Link aria-current={path.startsWith('/teacher/tasks') ? 'page' : undefined} href="/teacher/tasks" onClick={close}>My tasks</Link>
        <Link aria-current={path.startsWith('/library') ? 'page' : undefined} href="/library" onClick={close}>Question bank</Link>
      </> : <>
      <Link aria-current={path.startsWith("/courses") ? "page" : undefined} href="/courses" onClick={close}>{t("Все курсы", "All courses")}</Link>
      <Link aria-current={path.startsWith("/library") ? "page" : undefined} href="/library" onClick={close}>{t("Практика", "Practice")}</Link>
      <Link href="/search" onClick={close}>{t("Поиск", "Search")}</Link>
      <Link aria-current={path.startsWith("/teacher") ? "page" : undefined} href={teacher ? "/teacher" : "/for-teachers"} onClick={close}>{t("Учителю", "For teachers")}</Link>
      </>}
      {(student || staff) && <Link className="student-mobile-search" href="/search" onClick={close}>Search</Link>}
      {languages("mobile-locale")}
    </nav>
    <div className="account">{(student || staff) && <Link className="student-header-search" href="/search" aria-label="Search"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></Link>}{languages("desktop-locale")}<details className="discovery-account" ref={account} onToggle={e => { if (e.currentTarget.open) setOpen(false); }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) e.currentTarget.open = false; }}>
      <summary aria-label={t("Меню аккаунта", "Account menu")}>{student || staff ? <span className="student-avatar" aria-hidden="true">{initials}</span> : <><svg className="account-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg><span className="header-account-name">{actor ? actor.displayName.split(" ")[0] : t("Аккаунт", "Account")}</span><span className="header-account-chevron" aria-hidden="true">⌄</span></>}</summary>
      <div className="discovery-account-links" onClick={e => { if ((e.target as HTMLElement).closest("a")) close(); }}>
        {actor ? <><Link href="/">{t("Моё обучение", "My learning")}</Link><Link href={teacher ? "/teacher" : "/student"}>{t("Мой кабинет", "My dashboard")}</Link><Link href="/student/progress">{t("Мой прогресс", "My progress")}</Link><Link href="/bookmarks">{t("Закладки", "Bookmarks")}</Link><Link href="/access">{t("Мой доступ", "My access")}</Link>{admin && <Link href="/admin">{t("Управление", "Admin")}</Link>}<Button variant="text" onClick={async () => { await api("auth/logout", "POST"); window.location.assign("/login"); }}>{t("Выйти", "Sign out")}</Button></> : <><Link href="/login">{t("Войти", "Sign in")}</Link><Link href="/register">{t("Создать аккаунт", "Create an account")}</Link></>}
        <Link href="/olympiads">{t("Олимпиады и соревнования", "Olympiads & competitions")}</Link>
        {student && <Link href="/library" onClick={close}>Question bank</Link>}
        {(actor || !publicPage) && !student && !staff && <fieldset className="account-language" disabled={!!lens}><legend>{t("Язык личного кабинета", "Dashboard language")}</legend>{(["en", "ru"] as const).map(value => <label key={value}><Input type="radio" name="account-language" value={value} checked={accountLanguage === value} onChange={() => changeLanguage(value)} /><span>{value === "en" ? "English" : "Русский"}</span></label>)}</fieldset>}
        <fieldset className="view-form-fields" disabled={!!lens}><ThemePicker /></fieldset>
      </div>
    </details></div>
  </div></header>;
}
