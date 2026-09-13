"use client";
import { useState } from "react";
import type { structure } from "@/lib/structure";
import { api, ErrorNotice, Form, Heading, Loading, useLocale, useResource } from "./ui";
type Text = { locale: "ru" | "en"; title: string; description?: string; body?: string; examples?: string | null };
type Selection = { kind: "course" | "chapter" | "topic"; id?: string; parentId?: string; slug?: string; position: number; published?: boolean; texts: Text[]; taskIds?: string[] };
export function StructureEditor() {
  const { t } = useLocale(), r = useResource<Awaited<ReturnType<typeof structure>>>("admin/structure");
  const [selected, setSelected] = useState<Selection | null>(null);
  return <><Heading title={t("Структура курсов", "Course structure")} subtitle={t("Курс → глава → тема. Изменение текста темы создаёт новую версию.", "Course → chapter → topic. Editing topic content creates a new version.")}><button onClick={() => setSelected({ kind: "course", position: r.data?.length ?? 0, published: false, texts: [] })}>{t("Новый курс", "New course")}</button></Heading>
    <ErrorNotice error={r.error} />{!r.data ? <Loading /> : <div className="grid two"><section className="card structure-tree">{r.data.map(c => <details key={c.id}><summary>{c.texts.find(x => x.locale === "ru")?.title ?? c.texts[0]?.title}</summary><div className="row"><button className="secondary" onClick={() => setSelected({ kind: "course", id: c.id, slug: c.slug, position: c.position, published: c.published, texts: c.texts })}>{t("Изменить курс", "Edit course")}</button><button className="secondary" onClick={() => setSelected({ kind: "chapter", parentId: c.id, position: c.topics.length, texts: [] })}>{t("Добавить главу", "Add chapter")}</button></div>
      {c.topics.map(ch => <details key={ch.id}><summary>{ch.texts.find(x => x.locale === "ru")?.title ?? ch.texts[0]?.title}</summary><div className="row"><button className="secondary" onClick={() => setSelected({ kind: "chapter", id: ch.id, parentId: c.id, slug: ch.slug, position: ch.position, texts: ch.texts })}>{t("Изменить главу", "Edit chapter")}</button><button className="secondary" onClick={() => setSelected({ kind: "topic", parentId: ch.id, position: ch.lessons.length, texts: [] })}>{t("Добавить тему", "Add topic")}</button></div>
        {ch.lessons.map(l => <p key={l.id}><button className="quiet" onClick={() => setSelected({ kind: "topic", id: l.id, parentId: ch.id, position: l.position, texts: l.versions[0]?.texts ?? [], taskIds: l.tasks.map(t => t.taskId) })}>{l.versions[0]?.texts.find(x => x.locale === "ru")?.title ?? l.versions[0]?.texts[0]?.title} · {l.tasks.length} →</button></p>)}</details>)}</details>)}</section>
      {selected ? <StructureForm key={`${selected.kind}:${selected.id ?? selected.parentId ?? "new"}`} initial={selected} done={() => { r.refresh(); setSelected(null); }} /> : <p className="empty">{t("Выберите элемент структуры для редактирования.", "Select a course, chapter or topic to edit.")}</p>}</div>}</>;
}
function StructureForm({ initial, done }: { initial: Selection; done: () => void }) {
  const { t } = useLocale();
  const [draft, setDraft] = useState({ ...initial, texts: (["ru", "en"] as const).map(locale => initial.texts.find(t => t.locale === locale) ?? { locale, title: "", description: "", body: "", examples: "" }) });
  const [ids, setIds] = useState(initial.taskIds?.join("\n") ?? "");
  function text(index: number, field: "title" | "description" | "body" | "examples", value: string) { setDraft(d => ({ ...d, texts: d.texts.map((t, i) => i === index ? { ...t, [field]: value } : t) })); }
  return <section className="card"><h2>{t("Редактирование", "Edit")} · {initial.kind}</h2><Form label={t("Сохранить", "Save")} done={done} submit={() => api("admin/structure", "POST", { ...draft, texts: draft.texts.filter(t => t.title.trim()).map(t => ({ ...t, examples: t.examples ?? "" })), ...(draft.kind === "topic" ? { taskIds: ids.split(/\s+/).filter(Boolean) } : {}) })}>
    {!draft.id && draft.kind !== "topic" && <label>{t("Адрес (slug)", "Address (slug)")}<input required pattern="[a-z0-9-]{2,120}" value={draft.slug ?? ""} onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))} /></label>}
    <label>{t("Позиция", "Position")}<input type="number" min={0} max={10000} value={draft.position} onChange={e => setDraft(d => ({ ...d, position: Number(e.target.value) }))} /></label>
    {draft.kind === "course" && <label className="check"><input type="checkbox" checked={draft.published ?? false} onChange={e => setDraft(d => ({ ...d, published: e.target.checked }))} />{t("Курс опубликован", "Course is published")}</label>}
    {draft.texts.map((row, i) => <section className="stack" key={row.locale}><strong>{row.locale.toUpperCase()}</strong><label>{t("Название", "Title")}<input value={row.title} onChange={e => text(i, "title", e.target.value)} /></label>
      {draft.kind === "course" && <label>{t("Описание", "Description")}<textarea value={row.description ?? ""} onChange={e => text(i, "description", e.target.value)} /></label>}
      {draft.kind === "topic" && <><label>{t("Теория", "Theory")}<textarea rows={8} value={row.body ?? ""} onChange={e => text(i, "body", e.target.value)} /></label><label>{t("Разобранные примеры", "Worked examples")}<textarea rows={8} value={row.examples ?? ""} onChange={e => text(i, "examples", e.target.value)} /></label></>}</section>)}
    {draft.kind === "topic" && <label>{t("ID задач по порядку, по одному на строку. Задачи можно включать в несколько тем.", "Task IDs in order, one per line. Tasks can belong to several topics.")}<textarea rows={8} value={ids} onChange={e => setIds(e.target.value)} /></label>}
  </Form></section>;
}
