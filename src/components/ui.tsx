"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import type { Actor } from "@/lib/security";
export const LocaleContext = createContext<"ru" | "en">("ru");
export const ActorContext = createContext<Actor | null>(null);
export function useLocale() { const lang = useContext(LocaleContext); return { lang, t: (ru: string, en: string) => lang === "ru" ? ru : en }; }
export const errorLabels: Record<string, [string, string]> = {
  INVALID_PRESENTATION_URL: ["Нужна ссылка на презентацию Google Slides или файл Google Drive.", "Use a Google Slides presentation or Google Drive file link."],
  DUPLICATE_PRESENTATION: ["Эта презентация уже прикреплена к теме.", "This presentation is already attached to this topic."],
  PRESENTATION_LIMIT: ["В теме уже 50 презентаций. Уберите ненужную ссылку.", "This topic already has 50 presentations. Remove an unused link."],
  STALE_PRESENTATION: ["Ссылка или её порядок изменились. Закройте форму и откройте её заново.", "The link or its order changed. Close the form and open it again."],
  STUDY_ONLY: ["Это действие доступно только в вашей самостоятельной практике.", "This action is only available in your independent practice."],
  HELP_NOT_PROVIDED: ["Этот материал не предоставлен источником.", "This material was not provided by the source."],
  SUBMIT_BEFORE_SELF_CHECK: ["Сначала отправьте свой ответ, затем отметьте самопроверку.", "Submit your answer before recording a self-check."],
  PROVISIONAL_OLYMPIAD_SCORE: ["Баллы пилотных задач olymp предварительные. Используйте их в учебных работах; для официальной олимпиады нужна проверенная шкала.", "Pilot olymp scores are provisional. Use these tasks for learning; official olympiads require a verified scoring scale."],
  UNSAVED_ANSWERS: ["Ответ пока не сохранён. Дождитесь сохранения или повторите попытку; введённый текст остаётся на экране.", "Your answer is not saved yet. Wait or retry; your text remains on screen."],
  STALE_BASKET: ["Набор изменён в другой вкладке. Обновите страницу, прежде чем продолжить.", "The task set changed in another tab. Reload before continuing."],
  BASKET_LIMIT: ["В одном наборе может быть до 50 задач.", "A set can contain up to 50 tasks."],
  TASK_UNAVAILABLE: ["Набор пуст или содержит недоступные задачи. Проверьте его перед назначением.", "The set is empty or contains unavailable tasks. Review it before assigning."],
  STALE_REVIEW: ["Оценка изменена в другой вкладке. Скопируйте свой комментарий и обновите страницу.", "This review changed in another tab. Copy your feedback and reload."],
  INVALID_POINTS: ["Укажите баллы в пределах части задачи или оставьте поле пустым.", "Enter points within the part limit or leave the field blank."],
  IMAGE_PIXEL_LIMIT: ["Изображение превышает предел пикселей. Подготовьте уменьшенную копию и проверьте её перед отправкой.", "Image exceeds the pixel limit. Prepare and check a smaller copy before uploading."],
  INVALID_IMAGE: ["Не удалось прочитать изображение. Выберите исправный PNG или JPEG.", "Cannot read this image. Choose a valid PNG or JPEG."],
  IMAGE_DECODE_FAILED: ["Изображение повреждено или не может быть обработано в отведённое время.", "Image is damaged or could not be processed within the time limit."],
  IMAGE_PROCESSOR_BUSY: ["Сейчас обрабатываются другие фото. Повторите отправку через несколько секунд.", "Other photos are being processed. Retry in a few seconds."],
  ANIMATED_IMAGE_UNSUPPORTED: ["Выберите обычное изображение без анимации.", "Choose a still image without animation."],
  UPLOAD_CONNECTION_FAILED: ["Связь прервалась. Обновите список вложений перед повторной отправкой.", "Connection interrupted. Refresh attachments before uploading again."],
  REPLACEMENT_MISSING: ["Заменяемый файл уже изменён. Обновите список вложений.", "The replacement target changed. Refresh the attachment list."],
  LOGIN_REQUIRED: ["Войдите в свой аккаунт.", "Please sign in."], INVALID_CREDENTIALS: ["Неверный логин или пароль.", "Invalid login or password."],
  TOO_MANY_REQUESTS: ["Слишком много попыток. Попробуйте позже.", "Too many requests. Try again later."],
  ALREADY_EXISTS: ["Такая запись уже существует. Выберите другой логин или название.", "This record already exists. Choose another login or name."],
  FORBIDDEN: ["Недостаточно прав.", "Access denied."], NOT_FOUND: ["Запись не найдена или недоступна.", "Not found or unavailable."],
  INVALID_INPUT: ["Проверьте заполнение полей.", "Check the form fields."], SERVICE_UNAVAILABLE: ["Сервис временно недоступен. Попробуйте позже.", "Service unavailable. Please try again later."],
  UNEXPECTED_SERVER_RESPONSE: ["Сервер отклонил запрос или вернул неожиданный ответ. Передайте администратору код ниже.", "The server rejected the request or returned an unexpected response. Share the code below with an administrator."],
  STALE_REVISION: ["Ответы изменены в другой вкладке. Обновите страницу перед продолжением.", "Answers changed in another tab. Reload before continuing."],
  TIME_EXPIRED: ["Время закончилось. Сохранённые ответы отправлены.", "Time is up. Saved answers were submitted."],
  ATTEMPT_FINISHED: ["Работа уже отправлена.", "This attempt has already been submitted."], ATTEMPT_LIMIT: ["Все попытки использованы.", "No attempts remaining."],
  WORK_NOT_OPEN: ["Работа ещё не открыта.", "This work is not open yet."], WORK_CLOSED: ["Приём ответов завершён.", "This work is closed."],
  RESULTS_HIDDEN: ["Результаты ещё не опубликованы.", "Results have not been published."], ROUND_NOT_FINISHED: ["Дождитесь окончания тура.", "Wait until the round has ended."],
  INVALID_AGE_GROUP: ["Возраст не соответствует выбранной группе.", "Age does not match the selected group."],
  REGISTRATION_CLOSED: ["Регистрация закрыта.", "Registration is closed."], SUBSCRIPTION_REQUIRED: ["Для этой практики нужен доступ по тарифу.", "This practice requires a subscription."],
  INVALID_FILE_TYPE: ["Разрешены только PNG, JPEG и PDF.", "Only PNG, JPEG and PDF are allowed."], FILE_TOO_LARGE: ["Максимальный размер файла — 8 МБ.", "Maximum file size is 8 MB."],
  FILE_LIMIT: ["Не более пяти файлов на часть задачи.", "Up to five files per question part."], STORAGE_QUOTA: ["Лимит файлов аккаунта исчерпан.", "Account storage quota reached."],
  INVALID_RECOVERY: ["Код восстановления недействителен или истёк.", "Recovery code is invalid or expired."],
  CANNOT_CHANGE_OWN_ACCESS: ["Нельзя менять собственные права.", "You cannot change your own access."],
  CLASS_NOT_FOUND: ["Класс с таким кодом не найден.", "Class code not found."], MEMBERSHIP_REMOVED: ["Обратитесь к учителю для восстановления доступа в класс.", "Ask your teacher to restore your class membership."],
};
export class ApiError extends Error { constructor(public code: string, public status: number, public fields?: { path: string; message: string }[], public diagnostic?: string) { super(code); } }
export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch("/api/" + url, { method, credentials: "same-origin", cache: "no-store",
    ...(method !== "GET" ? { headers: body instanceof FormData ? {} : { "Content-Type": "application/json" }, body: body instanceof FormData ? body : JSON.stringify(body ?? {}) } : {}) });
  const data = await response.json().catch(() => { throw new ApiError("UNEXPECTED_SERVER_RESPONSE", response.status, undefined, "HTTP_" + response.status + " / NON_JSON"); });
  if (!response.ok) throw new ApiError(data.error ?? "SERVICE_UNAVAILABLE", response.status, data.fields, data.diagnostic);
  return data;
}
export function useResource<T>(path: string | null) {
  const { lang } = useLocale();
  const [data, setData] = useState<T | null>(null), [error, setError] = useState<unknown>(null), [tick, setTick] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const requestKey = `${path}|${lang}|${tick}`;
  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path + (path.includes("?") ? "&" : "?") + "lang=" + lang).then(v => { if (live) { setData(v); setError(null); setLoadedKey(`${path}|${lang}|${tick}`); } }).catch(e => { if (live) { setError(e); setLoadedKey(`${path}|${lang}|${tick}`); } });
    return () => { live = false; };
  }, [path, lang, tick]);
  return { data, error, isLoading: !!path && loadedKey !== requestKey, refresh: () => setTick(v => v + 1) };
}
export function ErrorNotice({ error }: { error: unknown }) {
  const { lang, t } = useLocale();
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : "SERVICE_UNAVAILABLE";
  return <div className="notice error" role="alert">{errorLabels[code]?.[lang === "ru" ? 0 : 1] ?? t("Не удалось выполнить действие.", "Could not complete the action.")}
    {error instanceof ApiError && error.diagnostic && /^[A-Za-z0-9_. /]{1,500}$/.test(error.diagnostic) ? <div className="muted">{t("Диагностика", "Diagnostic")}: {error.diagnostic}</div> : null}
    {error instanceof ApiError && error.fields?.length ? <div className="muted">{error.fields.map(f => f.path).join(", ")}</div> : null}</div>;
}
export function Loading() { const { t } = useLocale(); return <div className="skeleton" role="status">{t("Загрузка…", "Loading…")}</div>; }
export function Empty({ children }: { children?: ReactNode }) { const { t } = useLocale(); return <p className="empty">{children ?? t("Пока ничего нет.", "Nothing here yet.")}</p>; }
export function MathContent({ html }: { html: string }) { return <div className="math-content" dangerouslySetInnerHTML={{ __html: html }} />; }
export function MaterialAsset({ asset }: { asset: { id: string; caption: string; mimeType: string } }) {
  return <figure style={{ margin: "16px 0" }}>{asset.mimeType.startsWith("image/") && <Image src={"/api/files/" + asset.id} alt={asset.caption} unoptimized width={1000} height={750} style={{ width: "100%", height: "auto", maxHeight: 600, objectFit: "contain" }} />}
    <figcaption><a className="attachment" href={"/api/files/" + asset.id} target="_blank" rel="noopener noreferrer">{asset.caption} ↗</a></figcaption></figure>;
}
export function Heading({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">Maths4U · Learning together</p><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{children}</div>;
}
export function DateLabel({ value }: { value: string | Date }) {
  const { lang } = useLocale();
  return <time dateTime={new Date(value).toISOString()}>{new Date(value).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>;
}
export function Status({ value }: { value: string }) {
  const { t } = useLocale();
  const names: Record<string, [string, string]> = { IN_PROGRESS: ["В работе", "In progress"], SUBMITTED: ["На проверке", "Awaiting review"], GRADED: ["Проверено", "Reviewed"], HOMEWORK: ["Домашняя работа", "Homework"], TEST: ["Тест", "Test"], PRACTICE: ["Практика", "Practice"], OLYMPIAD: ["Олимпиада", "Olympiad"] };
  return <span className={"badge " + (value === "SUBMITTED" ? "gold" : "")}>{names[value] ? t(...names[value]) : value}</span>;
}
export function ActionButton({ label, action, onDone, secondary = false }: { label: string; action: () => Promise<unknown>; onDone?: () => void; secondary?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  return <div><button disabled={busy} className={secondary ? "secondary" : ""} onClick={async () => { setBusy(true); setError(null); try { await action(); onDone?.(); } catch (e) { setError(e); } finally { setBusy(false); } }}>{busy ? "…" : label}</button><ErrorNotice error={error} /></div>;
}
export function Form({ children, submit, label, done }: { children: ReactNode; submit: (data: FormData) => Promise<unknown>; label: string; done?: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [success, setSuccess] = useState(false);
  const { t } = useLocale();
  return <form className="form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(null); setSuccess(false);
    const data = new FormData(event.currentTarget);
    try { await submit(data); setSuccess(true); done?.(); } catch (e) { setError(e); } finally { setBusy(false); }
  }}>{children}<ErrorNotice error={error} />{success && <div className="notice" role="status">{t("Готово.", "Done.")}</div>}<button disabled={busy} type="submit">{busy ? t("Сохранение…", "Saving…") : label}</button></form>;
}
export function Field({ name, label, type = "text", required = true, value, min, max }: { name: string; label: string; type?: string; required?: boolean; value?: string | number; min?: number; max?: number }) {
  return <label>{label}<input name={name} type={type} required={required} defaultValue={value} min={min} max={max} /></label>;
}
export const str = (data: FormData, key: string) => String(data.get(key) ?? "");
export const num = (data: FormData, key: string) => Number(data.get(key));
export function localDate(value: Date) { return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
