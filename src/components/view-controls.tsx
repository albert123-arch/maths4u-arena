"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "./controls";
import { api, ErrorNotice, useLocale } from "./ui";
import { useView } from "./view-state";
import type { ViewLens } from "@/lib/request-view";
export function ViewButton({ role, targetId, children, next }: { role: "STUDENT" | "TEACHER"; targetId?: string; children: React.ReactNode; next?: string }) {
  const lens = useView(), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  return <span className="view-button"><Button className="secondary" disabled={busy || !!lens} onClick={async () => { setBusy(true); try { const r = await api<{ href: string }>("view/enter", "POST", { mode: targetId ? "USER" : "ROLE", role, ...(targetId ? { targetId } : {}) }); window.location.assign(next ?? r.href); } catch(e) { setError(e); setBusy(false); } }}>{children}</Button><ErrorNotice error={error} /></span>;
}
export function ViewBanner({ changed }: { changed: (lens: ViewLens | null) => void }) {
  const lens = useView(), { t } = useLocale(), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const exiting = useRef(false), lastTouched = useRef(0);
  useEffect(() => {
    if (!lens) return;
    const activity = (e: Event) => {
      if (exiting.current || e.target instanceof Element && e.target.closest("[data-view-exit]")) return;
      if (Date.now() - lastTouched.current < 60000) return;
      lastTouched.current = Date.now();
      void api<{ expiresAt: string }>("view/touch", "POST").then(r => { if (!exiting.current) changed({ ...lens, expiresAt: r.expiresAt }); }).catch(() => { if (!exiting.current) window.location.reload(); });
    };
    const timeout = setTimeout(() => { if (!exiting.current) window.location.reload(); }, Math.max(0, Date.parse(lens.expiresAt) - Date.now()) + 250);
    const focus = () => { if (exiting.current) return; void api<{ lens: ViewLens | null }>("auth/me").then(r => { if (!exiting.current && r.lens?.nonce !== lens.nonce) window.location.reload(); }).catch(() => {}); };
    window.addEventListener("pointerdown", activity); window.addEventListener("keydown", activity); window.addEventListener("scroll", activity, { passive: true }); window.addEventListener("focus", focus);
    return () => { clearTimeout(timeout); window.removeEventListener("pointerdown", activity); window.removeEventListener("keydown", activity); window.removeEventListener("scroll", activity); window.removeEventListener("focus", focus); };
  }, [lens, changed]);
  if (!lens) return null;
  return <div className="view-banner" role="status" data-testid="view-banner"><div><strong>You are viewing as {lens.label}</strong><span>{lens.mode === "USER" ? t("Только чтение. Изменения запрещены.", "Read only. Changes are disabled.") : t("Ответы предпросмотра не сохраняются.", "Preview answers are not saved.")}</span></div><Button data-view-exit disabled={busy} onClick={async () => { exiting.current = true; setBusy(true); try { const r = await api<{ href: string }>("view/exit", "POST"); window.location.assign(r.href); } catch(e) { exiting.current = false; setError(e); setBusy(false); } }}>Exit</Button><ErrorNotice error={error} /></div>;
}
