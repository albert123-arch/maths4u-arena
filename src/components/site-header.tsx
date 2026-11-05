"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination -- Discard account state on logout. */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Actor } from "@/lib/security";
import type { Locale } from "@/lib/locale";
import { api, useLocale } from "./ui";
import { Button, Input } from "./controls";
import { ThemePicker } from "./theme-picker";
import type { LanguagePair } from "@/lib/public-page-model";

export function SiteHeader({ actor, path, hidden, publicPage, languagePair, accountLanguage, changeLanguage }: { actor: Actor | null; path: string; hidden: boolean; publicPage: boolean; languagePair?: LanguagePair; accountLanguage: Locale; changeLanguage: (lang: Locale) => void }) {
  const { lang, t } = useLocale(), [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null), toggle = useRef<HTMLButtonElement>(null), account = useRef<HTMLDetailsElement>(null);
  const admin = actor?.roles.some(r => r.role === "ADMIN"), teacher = admin || actor?.roles.some(r => r.role === "TEACHER");
  function close() { setOpen(false); if (account.current) account.current.open = false; }
  useEffect(() => {
    function key(e: KeyboardEvent) { if (e.key !== "Escape") return; if (account.current?.open) { account.current.open = false; account.current.querySelector("summary")?.focus(); } else if (toggle.current?.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.current.focus(); } }
    function outside(e: PointerEvent) { if (!root.current?.contains(e.target as Node)) { setOpen(false); if (account.current) account.current.open = false; } }
    document.addEventListener("keydown", key); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, []);
  function languages(className: string) { return publicPage && languagePair ? <div className={`locale ${className}`} aria-label={t("Язык страницы", "Page language")}>{(["en", "ru"] as const).map(value => <Link key={value} href={languagePair[value]} aria-current={lang === value ? "page" : undefined}>{value.toUpperCase()}</Link>)}</div> : null; }
  return <header className="topbar" hidden={hidden} ref={root}><div className="topbar-inner">
    <Link className="brand" href="/" onClick={close}><span className="brand-symbol" aria-hidden="true">m</span>Maths4U<span className="badge beta-badge">BETA</span></Link>
    <Button variant="text" className="mobile-nav-toggle" ref={toggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => { setOpen(v => !v); if (account.current) account.current.open = false; }}><span aria-hidden="true">{open ? "×" : "☰"}</span>{t("Меню", "Menu")}</Button>
    <nav id="site-navigation" className="nav" data-open={open} aria-label={t("Основная навигация", "Main navigation")}>
      <Link aria-current={path.startsWith("/courses") ? "page" : undefined} href="/courses" onClick={close}>{t("Все курсы", "All courses")}</Link>
      <Link aria-current={path.startsWith("/library") ? "page" : undefined} href="/library" onClick={close}>{t("Практика", "Practice")}</Link>
      <Link href="/search" onClick={close}>{t("Поиск", "Search")}</Link>
      <Link aria-current={path.startsWith("/teacher") ? "page" : undefined} href={teacher ? "/teacher" : "/for-teachers"} onClick={close}>{t("Учителю", "For teachers")}</Link>
      {languages("mobile-locale")}
    </nav>
    <div className="account">{languages("desktop-locale")}<details className="discovery-account" ref={account} onToggle={e => { if (e.currentTarget.open) setOpen(false); }} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) e.currentTarget.open = false; }}>
      <summary aria-label={t("Меню аккаунта", "Account menu")}><svg className="account-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg><span className="header-account-name">{actor ? actor.displayName.split(" ")[0] : t("Аккаунт", "Account")}</span><span className="header-account-chevron" aria-hidden="true">⌄</span></summary>
      <div className="discovery-account-links" onClick={e => { if ((e.target as HTMLElement).closest("a")) close(); }}>
        {actor ? <><Link href="/">{t("Моё обучение", "My learning")}</Link><Link href={teacher ? "/teacher" : "/student"}>{t("Мой кабинет", "My dashboard")}</Link><Link href="/student/progress">{t("Мой прогресс", "My progress")}</Link><Link href="/bookmarks">{t("Закладки", "Bookmarks")}</Link><Link href="/access">{t("Мой доступ", "My access")}</Link>{admin && <Link href="/admin">{t("Управление", "Admin")}</Link>}<Button variant="text" onClick={async () => { await api("auth/logout", "POST"); window.location.assign("/login"); }}>{t("Выйти", "Sign out")}</Button></> : <><Link href="/login">{t("Войти", "Sign in")}</Link><Link href="/register">{t("Создать аккаунт", "Create an account")}</Link></>}
        <Link href="/olympiads">{t("Олимпиады и соревнования", "Olympiads & competitions")}</Link>
        {(actor || !publicPage) && <fieldset className="account-language"><legend>{t("Язык личного кабинета", "Dashboard language")}</legend>{(["en", "ru"] as const).map(value => <label key={value}><Input type="radio" name="account-language" value={value} checked={accountLanguage === value} onChange={() => changeLanguage(value)} /><span>{value === "en" ? "English" : "Русский"}</span></label>)}</fieldset>}
        <ThemePicker />
      </div>
    </details></div>
  </div></header>;
}
