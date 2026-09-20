"use client";
import Link from "next/link";
import { useState } from "react";
import type { PresentationsDto } from "@/lib/presentations";
import { presentationLink } from "@/lib/presentation-url";
import { api, ErrorNotice, Loading, useLocale, useResource } from "./ui";

type Item = PresentationsDto["items"][number];
export function LessonPresentations({ lessonId }: { lessonId: string }) {
  const { t } = useLocale(), endpoint = `teaching/topics/${lessonId}/presentations`;
  const resource = useResource<PresentationsDto>(endpoint);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  async function change(body: unknown) {
    setBusy(true); setError(null);
    try { await api(endpoint, "POST", body); setEditing(null); setRemoving(null); resource.refresh(); }
    catch (e) { setError(e); resource.refresh(); }
    finally { setBusy(false); }
  }
  const disabled = busy || resource.isLoading;
  return <section className="card lesson-presentations" aria-labelledby="presentations-heading">
    <div className="row spread"><div><p className="eyebrow">{t("Для урока", "For the classroom")}</p><h2 id="presentations-heading">{t("Презентации темы", "Topic presentations")}</h2></div>
      <button className="secondary" disabled={disabled} onClick={() => { setEditing("new"); setError(null); }}>{t("+ Добавить ссылку", "+ Add a link")}</button></div>
    <p className="muted">{t("Материалы видны учителям и администратору. Ученики их здесь не видят. Изменять ссылку может её автор или администратор.", "Visible to teachers and administrators, hidden from students. Only the author or an administrator can edit a link.")}</p>
    <ErrorNotice error={resource.error || error} />
    {!resource.data ? !resource.error && <Loading /> : !resource.data.items.length ? <div className="presentation-empty"><strong>{t("Ваша презентация — прямо в теме урока", "Your slides, right inside the topic")}</strong><p>{t("Загрузите PPTX или PDF в Google Drive либо создайте Google Slides. Скопируйте ссылку через «Поделиться» и добавьте её сюда.", "Upload a PPTX or PDF to Google Drive, or create Google Slides. Copy its Share link and add it here.")}</p></div> : <ol className="presentation-list">{resource.data.items.map((item, i) => <li key={item.id}>
      <span className="presentation-number" aria-hidden="true">{i + 1}</span><div className="presentation-description"><h3>{item.title}</h3><span className="muted">{item.kind === "slides" ? "Google Slides" : "Google Drive"} · {item.ownerName}</span></div>
      <div className="row presentation-actions"><Link className="button" href={`/teacher/board/${lessonId}/${item.id}`}>{t("На доску", "Present")}</Link>
        <a className="button secondary" href={item.openUrl} target="_blank" rel="noopener noreferrer">Google ↗</a>
        {item.editable && <><button className="quiet" disabled={disabled} onClick={() => { setEditing(item); setError(null); }}>{t("Изменить", "Edit")}</button>
          <button className="secondary" disabled={disabled || i === 0} aria-label={t("Выше: ", "Move up: ") + item.title} onClick={() => void change({ action: "up", id: item.id, revision: item.revision })}>↑</button>
          <button className="secondary" disabled={disabled || i === resource.data!.items.length - 1} aria-label={t("Ниже: ", "Move down: ") + item.title} onClick={() => void change({ action: "down", id: item.id, revision: item.revision })}>↓</button>
          <button className="quiet" disabled={disabled} onClick={() => setRemoving(item.id)}>{t("Удалить", "Remove")}</button></>}
      </div>
      {removing === item.id && <div className="notice presentation-confirm"><p>{t("Убрать ссылку из темы? Сам файл в Google Drive останется.", "Remove this link from the topic? The Google Drive file will remain.")}</p><div className="row"><button disabled={disabled} onClick={() => void change({ action: "remove", id: item.id, revision: item.revision })}>{t("Убрать ссылку", "Remove link")}</button><button className="secondary" disabled={busy} onClick={() => setRemoving(null)}>{t("Отмена", "Cancel")}</button></div></div>}
    </li>)}</ol>}
    {editing && <PresentationForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? undefined : editing} busy={disabled} save={change} close={() => setEditing(null)} />}
  </section>;
}

function PresentationForm({ item, busy, save, close }: { item?: Item; busy: boolean; save: (body: unknown) => Promise<void>; close: () => void }) {
  const { t } = useLocale();
  const [title, setTitle] = useState(item?.title ?? ""), [url, setUrl] = useState(item?.url ?? "");
  const link = presentationLink(url);
  return <form className="form presentation-form" onSubmit={e => { e.preventDefault(); if (link) void save({ action: "save", title, url, ...(item ? { id: item.id, revision: item.revision } : {}) }); }}>
    <h3>{item ? t("Изменить презентацию", "Edit presentation") : t("Добавить презентацию", "Add presentation")}</h3>
    <label>{t("Название презентации", "Presentation title")}<input autoFocus required maxLength={191} value={title} onChange={e => setTitle(e.target.value)} placeholder={t("Например, Квадратные уравнения · урок 1", "For example, Quadratic equations · lesson 1")} disabled={busy} /></label>
    <label>{t("Ссылка Google Slides или Google Drive", "Google Slides or Google Drive link")}<input type="url" required maxLength={2048} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/presentation/d/…/edit" disabled={busy} aria-invalid={!!url && !link} aria-describedby="presentation-link-help" /></label>
    <p id="presentation-link-help" className={url && !link ? "notice error" : "muted"}>{url && !link ? t("Вставьте ссылку на отдельный файл Google Drive или презентацию Google Slides, не ссылку на папку и не HTML-код.", "Paste a Google Drive file or Google Slides link, not a folder link or HTML embed code.") : t("Подойдёт обычная ссылка «Поделиться» или ссылка опубликованной презентации. Права доступа к файлу задаются в Google.", "Use a Share link or a published presentation link. Google controls access to the file.")}</p>
    <details className="presentation-help"><summary>{t("Как подготовить ссылку для смарт-борда", "Prepare a link for the smart board")}</summary><ol><li>{t("В Google Drive / Slides откройте «Поделиться». Разрешите просмотр учётной записи Google на доске или выберите «Все, у кого есть ссылка», если материал можно открыть по ссылке.", "Open Share in Google Drive / Slides. Grant access to the board’s Google account, or choose Anyone with the link if the material can be shared by link.")}</li><li>{t("Скопируйте ссылку и сохраните её здесь. Перед уроком нажмите «На доску» и проверьте показ именно на доске.", "Copy the link and save it here. Before class, select Present and check it on the actual board.")}</li><li>{t("Если Google запрашивает вход, откройте презентацию кнопкой Google. Для общедоступных Google Slides также можно использовать Файл → Поделиться → Опубликовать в интернете.", "If Google requests sign-in, use the Google button. Public Google Slides can also use File → Share → Publish to web.")}</li></ol></details>
    <div className="row"><button type="submit" disabled={busy || !link || !title.trim()}>{busy ? t("Сохранение…", "Saving…") : t("Сохранить", "Save")}</button><button type="button" className="secondary" disabled={busy} onClick={close}>{t("Отмена", "Cancel")}</button></div>
  </form>;
}
