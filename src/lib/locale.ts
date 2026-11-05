export const localeCookie = "maths4u_locale";
export type Locale = "en" | "ru";
export function localeValue(value: unknown): Locale | undefined {
  return value === "en" || value === "ru" ? value : undefined;
}
export function storedLocale(): Locale | undefined {
  try {
    const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(localeCookie + "="));
    return localeValue(cookie?.slice(localeCookie.length + 1)) ?? localeValue(localStorage.getItem(localeCookie));
  } catch { return undefined; }
}
export function rememberLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.cookie = `${localeCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  try { localStorage.setItem(localeCookie, locale); } catch { /* The cookie also works when browser storage is blocked. */ }
}
