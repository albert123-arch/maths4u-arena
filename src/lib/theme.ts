export type Theme = "system" | "light" | "dark";
export const themeCookie = "maths4u_theme";
let activeTheme: Theme | undefined;
export function themeValue(value: unknown): Theme | undefined {
  return value === "system" || value === "light" || value === "dark" ? value : undefined;
}
export function storedTheme(): Theme {
  try {
    const cookie = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(themeCookie + "="));
    return themeValue(cookie?.slice(themeCookie.length + 1)) ?? themeValue(localStorage.getItem(themeCookie)) ?? "system";
  } catch { return "system"; }
}
export function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
export function themeSnapshot(): Theme { return activeTheme ?? storedTheme(); }
export function receiveTheme(value: unknown) {
  activeTheme = themeValue(value) ?? "system";
  applyTheme(activeTheme);
}
export function rememberTheme(theme: Theme) {
  activeTheme = theme;
  applyTheme(theme);
  document.cookie = `${themeCookie}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  try { localStorage.setItem(themeCookie, theme); } catch { /* Cookie remains usable without localStorage. */ }
  window.dispatchEvent(new Event("maths4u-theme-change"));
}
