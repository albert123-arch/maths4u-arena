/* eslint-disable @next/next/no-head-element -- App Router document head contains only the pre-paint theme script, not managed metadata. */
import type { Metadata } from "next";
import localFont from "next/font/local";
import { InitialLocale } from "./ui";
import { InitialTheme } from "./theme-picker";
import "@/app/tokens.css";
import "@/app/globals.css";
import "@/app/discovery.css";
import "@/app/learning.css";
import "@/app/components.css";
import "@/app/topic.css";
import "@/app/public-catalog.css";
import "@/app/question-support.css";
import "@/app/dashboards.css";
import "../../public/platform-statistics.css";
import "katex/dist/katex.min.css";
export const siteMetadata: Metadata = { title: "Maths4U — Learn, practise, progress", description: "Mathematics courses, practice, class assignments and progress in one place.", icons: { icon: "/favicon.svg" } };
const inter = localFont({ src: "../app/fonts/InterVariable.woff2", variable: "--font-inter", weight: "100 900", display: "swap", adjustFontFallback: "Arial" });
// Runs before paint. No request headers/cookies are read by either server layout.
const themeScript = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)maths4u_theme=(light|dark|system)(?:;|$)/),v=c?c[1]:localStorage.getItem('maths4u_theme');if(v==='light'||v==='dark')document.documentElement.dataset.theme=v;else delete document.documentElement.dataset.theme}catch(e){}})()`;
export function SiteDocument({ children, locale }: { children: React.ReactNode; locale: "en" | "ru" }) {
  return <html lang={locale} className={inter.variable} suppressHydrationWarning><head><script id="theme-before-paint" dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><InitialLocale locale={locale}><InitialTheme theme="system">{children}</InitialTheme></InitialLocale></body></html>;
}
