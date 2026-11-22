"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Locale changes load the destination document and its root language. */
import { useContext } from "react";
import type { LanguagePair } from "@/lib/public-page-model";
import { PublicLocaleContext } from "./ui";

export function SiteLanguages({ languagePair, className, onNavigate }: {
  languagePair?: LanguagePair;
  className?: string;
  onNavigate?: () => void;
}) {
  const locale = useContext(PublicLocaleContext) ?? "en";
  // Load the destination document so the language comes from its root layout.
  return (
    <div className={`locale site-languages${className ? ` ${className}` : ""}`} role="group"
      aria-label={locale === "ru" ? "Язык страницы" : languagePair ? "Page language" : "Learning materials by language"}>
      {languagePair ? (["en", "ru"] as const).map(value => (
        <a key={value} href={languagePair[value]} hrefLang={value} lang={value}
          aria-current={locale === value ? "page" : undefined} onClick={onNavigate}>{value.toUpperCase()}</a>
      )) : <>
        <span lang="en" aria-current="true">EN</span>
        <a href="/ru" hrefLang="ru" onClick={onNavigate}>RU · Materials</a>
      </>}
    </div>
  );
}
