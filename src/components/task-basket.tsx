"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { BasketDto } from "@/lib/catalog";
import { ActorContext, api, ApiError, ErrorNotice, MathContent, useLocale } from "./ui";

const BasketContext = createContext<{ data: BasketDto | null; selection: string[]; busy: boolean; error: unknown; change: (fn: (ids: string[]) => string[]) => Promise<void>; flush: () => Promise<BasketDto | null> } | null>(null);
export function TaskBasketProvider({ children }: { children: ReactNode }) {
  const actor = useContext(ActorContext), { lang } = useLocale();
  const allowed = actor?.roles.some(r => ["TEACHER", "ADMIN"].includes(r.role));
  const [data, setData] = useState<BasketDto | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const current = useRef(data), pending = useRef<Promise<void>>(Promise.resolve());
  const [selection, setSelection] = useState<string[] | null>(null), failure = useRef<unknown>(null);
  useEffect(() => {
    if (!allowed) return; let closed = false;
    void api<BasketDto>(`basket?lang=${lang}`).then(next => { if (!closed && next.revision >= (current.current?.revision ?? 0)) { current.current = next; setData(next); } }).catch(setError);
    return () => { closed = true; };
  }, [allowed, lang]);
  function change(fn: (ids: string[]) => string[]) {
    const operation = pending.current.then(async () => {
      if (!current.current) throw new ApiError("SERVICE_UNAVAILABLE", 503);
      setBusy(true); setError(null); failure.current = null;
      try {
        const ids = fn(current.current.taskIds);
        if (ids.length > 50) throw new ApiError("BASKET_LIMIT", 400);
        setSelection(ids);
        const next = await api<BasketDto>(`basket?lang=${lang}`, "POST", { taskIds: ids, revision: current.current.revision });
        current.current = next; setData(next);
      } catch (e) { setError(e); failure.current = e; throw e; } finally { setBusy(false); setSelection(null); }
    });
    pending.current = operation.catch(() => {});
    return operation;
  }
  return <BasketContext.Provider value={{ data, selection: selection ?? data?.taskIds ?? [], busy, error, change, flush: () => pending.current.then(() => { if (failure.current) throw failure.current; return current.current; }) }}>{children}</BasketContext.Provider>;
}
export function useTaskBasket() { const value = useContext(BasketContext); if (!value) throw new Error("BASKET_PROVIDER_REQUIRED"); return value; }
export function BasketPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale(), b = useTaskBasket();
  const missing = b.data?.items.some(i => !i.available);
  const change = (fn: (ids: string[]) => string[]) => { void b.change(fn).catch(() => {}); };
  return <section className={compact ? "basket-panel card" : "basket-panel"} aria-label={t("Набор задач", "Task set")}>
    <div className="row spread"><h2>{t("Набор задач", "Task set")}</h2><span role="status">{b.data?.taskIds.length ?? 0} {t("задач", "tasks")} · {b.data?.items.reduce((n, i) => n + i.points, 0) ?? 0} {t("баллов", "points")}</span></div>
    <p className="muted">{t("Набор сохраняется в вашем аккаунте. Порядок ниже станет порядком работы; максимум 50 задач.", "The set is saved to your account. This order becomes the work order; up to 50 tasks.")}</p><ErrorNotice error={b.error} />
    {missing && <p className="notice error">{t("Некоторые задачи больше недоступны. Удалите их из набора перед назначением.", "Some tasks are no longer available. Remove them before assigning the work.")}</p>}
    {b.data?.items.some(i => i.public) && <p className="notice">{t("В наборе есть публичные учебные задачи. Их помощь доступна в самостоятельной практике; настройки теста не делают эти материалы секретными.", "This set includes public learning tasks. Their help is available in independent practice; test settings do not make this material secret.")}</p>}
    <ol className="basket-list">{b.data?.items.map((item, index) => <li key={item.id}><div className="row spread"><strong>{index + 1}. {item.available ? item.title : t("Задача недоступна", "Task unavailable")}</strong><span>{item.available ? item.points : "—"}</span></div>
      <div className="row"><button type="button" className="secondary" aria-label={t("Выше: ", "Move up: ") + item.title} disabled={b.busy || index === 0} onClick={() => change(ids => { const next = [...ids]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑</button>
        <button type="button" className="secondary" aria-label={t("Ниже: ", "Move down: ") + item.title} disabled={b.busy || index + 1 === b.data?.items.length} onClick={() => change(ids => { const next = [...ids]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })}>↓</button>
        <button type="button" className="quiet" disabled={b.busy} onClick={() => change(ids => ids.filter(id => id !== item.id))}>{t("Убрать", "Remove")}</button>
        {item.version && <details className="basket-preview"><summary>{t("Условие", "Statement")}</summary><MathContent html={item.version.statement} /></details>}</div></li>)}</ol>
    {!b.data?.items.length && <p className="empty">{t("Выберите задачи в каталоге или на странице темы.", "Choose tasks in the catalog or on a topic page.")}</p>}
    <div className="row"><Link className="button secondary" href="/library">{t("Подобрать задачи", "Choose tasks")}</Link>{compact && !!b.data?.items.length && !missing && <Link className="button" href="/teacher/works/new">{t("Создать ДЗ / тест", "Create homework / test")}</Link>}
      {!!b.data?.items.length && <button type="button" className="quiet" disabled={b.busy} onClick={() => change(() => [])}>{t("Очистить", "Clear")}</button>}</div>
  </section>;
}
