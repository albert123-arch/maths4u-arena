import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { InitialLocale } from "@/components/ui";
import { localeValue, localeCookie } from "@/lib/locale";
import { InitialTheme } from "@/components/theme-picker";
import { themeValue, themeCookie } from "@/lib/theme";
import "./tokens.css";
import "./globals.css";
import "./discovery.css";
import "./learning.css";
import "./components.css";
import "../../public/platform-statistics.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = { title: "Maths4U — Learn, practise, progress", description: "Mathematics courses, practice, class assignments and progress in one place.", icons: { icon: "/favicon.svg" } };
// The generated Arial fallback was 107.89% wide and wrapped the mobile actions
// before Inter arrived. Use the token's system stack with the fixed line heights.
const inter = localFont({ src: "./fonts/InterVariable.woff2", variable: "--font-inter", weight: "100 900", display: "swap", adjustFontFallback: false });
export default async function Layout({ children }: { children: React.ReactNode }) {
  const jar = await cookies(), lang = localeValue(jar.get(localeCookie)?.value) ?? "en";
  const selectedTheme = themeValue(jar.get(themeCookie)?.value) ?? "system";
  return <html lang={lang} className={inter.variable} data-theme={selectedTheme === "system" ? undefined : selectedTheme}><body><InitialLocale locale={lang}><InitialTheme theme={selectedTheme}>{children}</InitialTheme></InitialLocale></body></html>;
}
