"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { receiveTheme, rememberTheme, themeSnapshot, themeCookie, type Theme } from "@/lib/theme";
import { useLocale } from "./ui";
import { Input } from "./controls";
const ServerTheme = createContext<Theme>("system");
export function InitialTheme({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ServerTheme.Provider value={theme}>{children}</ServerTheme.Provider>;
}
function subscribe(update: () => void) {
  // Use the event payload: a different renderer can receive StorageEvent before
  // its document.cookie cache sees the matching write from the active tab.
  function sync(event: StorageEvent) { if (event.key !== themeCookie) return; receiveTheme(event.newValue); update(); }
  window.addEventListener("maths4u-theme-change", update); window.addEventListener("storage", sync);
  return () => { window.removeEventListener("maths4u-theme-change", update); window.removeEventListener("storage", sync); };
}
export function ThemePicker() {
  const initialTheme = useContext(ServerTheme), { t } = useLocale();
  const theme = useSyncExternalStore(subscribe, themeSnapshot, () => initialTheme);
  useEffect(() => { rememberTheme(themeSnapshot()); }, []);
  return <fieldset className="theme-picker"><legend>{t("Оформление", "Appearance")}</legend><div>{(["system", "light", "dark"] as const).map(value => <label key={value}><Input type="radio" name="appearance" value={value} checked={theme === value} onChange={() => rememberTheme(value)} /><span>{value === "system" ? t("Системная", "System") : value === "light" ? t("Светлая", "Light") : t("Тёмная", "Dark")}</span></label>)}</div></fieldset>;
}
