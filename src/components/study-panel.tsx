"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AttemptDto } from "@/lib/works";
import type { TopicStudyDto } from "@/lib/study";
import { api, ActionButton, DateLabel, ErrorNotice, useLocale, useResource } from "./ui";

export function StudyStatus({ state, helpUsed = false }: { state: string; helpUsed?: boolean }) {
  const { t } = useLocale();
  const labels: Record<string, [string, string]> = { NOT_STARTED: ["Не начато", "Not started"], IN_PROGRESS: ["В процессе", "In progress"], SUBMITTED: ["Ответ отправлен / ожидает проверки", "Submitted / awaiting review"], GRADED: ["Проверено", "Graded"], SELF_CHECKED: ["Самопроверка", "Self-checked"], NEEDS_REPEAT: ["Нужно повторить", "Needs review"] };
  return <span className="study-status"><span className="badge">{labels[state] ? t(...labels[state]) : state}</span>{helpUsed && <small>{t("С использованием помощи", "Help was used")}</small>}</span>;
}
export function TopicStudyPanel({ lessonId }: { lessonId: string }) {
  const { t } = useLocale(), [page, setPage] = useState(1), r = useResource<TopicStudyDto>(`study/topics/${lessonId}?page=${page}`);
  const continuing = r.data?.items.find(i => i.state === "IN_PROGRESS");
  return <section className="card study-panel"><h2>{t("Моя работа по теме", "My topic progress")}</h2><ErrorNotice error={r.error} />{r.data && <>
    <p>{t("Проверено на полный балл без предварительного раскрытия помощи: ", "Full marks without revealing help before submission: ")}{r.data.completedWithoutHelp} / {r.data.items.length}</p>
    <p className="muted">{t("Самопроверка и чтение теории учитываются отдельно от проверенных ответов.", "Self-checking and reading theory are tracked separately from graded answers.")}</p>
    <div className="row">{continuing && <Link className="button" href={`/attempts/${continuing.attemptId}`}>{t("Продолжить", "Continue")} →</Link>}
      <ActionButton secondary label={r.data.theoryRead ? t("Теория прочитана ✓", "Theory read ✓") : t("Отметить теорию прочитанной", "Mark theory as read")} action={() => api(`lessons/${lessonId}/progress`, "POST", { completed: !r.data!.theoryRead })} onDone={r.refresh} /></div>
    <details className="study-history"><summary>{t("История по теме", "Topic history")}</summary>{r.data.history.length ? <ol>{r.data.history.map(row => <li key={row.id}><Link href={`/attempts/${row.id}`}>{row.title}</Link><StudyStatus state={row.state} helpUsed={row.helpUsed} /><DateLabel value={row.startedAt} /></li>)}</ol> : <p className="muted">{t("Практика ещё не начата.", "No practice started yet.")}</p>}
      {r.data.historyPages > 1 && <div className="row"><button className="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button><span>{page} / {r.data.historyPages}</span><button className="secondary" disabled={page >= r.data.historyPages} onClick={() => setPage(p => p + 1)}>→</button></div>}</details>
  </>}</section>;
}
export function StudyActions({ dto, save, apply }: { dto: AttemptDto; save: () => Promise<void>; apply: (next: AttemptDto) => void }) {
  const { t, lang } = useLocale(), router = useRouter();
  const progress = useResource<TopicStudyDto>(dto.study?.lessonId ? `study/topics/${dto.study.lessonId}` : null);
  if (!dto.study) return null;
  const s = dto.study, available = dto.questions[0].availableHelp;
  const labels = { hint: t("Подсказка", "Hint"), answer: t("Краткий ответ", "Short answer"), solution: t("Подробное решение", "Detailed solution"), markScheme: t("MS / критерии", "MS / criteria") };
  const index = progress.data?.items.findIndex(i => i.taskId === s.taskId) ?? -1, next = index >= 0 ? progress.data?.items[index + 1] : undefined;
  return <section className="card study-actions"><p className="eyebrow">{t("Самостоятельная практика", "Independent practice")}</p>
    <p className="muted">{t("Помощь раскрывается по вашему выбору. Просмотр решения и самопроверка не выставляют оценку.", "Reveal help when you choose. Viewing a solution or self-checking does not award marks.")}</p>
    {dto.status === "IN_PROGRESS" && <p className="muted">{t("Ответ можно продолжать до ", "You can continue this answer until ")}<DateLabel value={dto.expiresAt} /></p>}
    <div className="row">{(Object.keys(labels) as (keyof typeof labels)[]).filter(kind => available?.[kind]).map(kind => <ActionButton key={kind} secondary label={labels[kind] + (s.help[kind] ? " ✓" : "")} action={async () => { await save(); apply(await api<AttemptDto>(`attempts/${dto.id}/help?lang=${lang}`, "POST", { kind })); }} />)}</div>
    {!!Object.values(s.help).some(Boolean) && <p className="notice">{t("Использование помощи отмечено в истории. Раскрытые материалы находятся под ответом.", "Help usage is recorded in your history. Revealed materials appear below your answer.")}</p>}
    {dto.status !== "IN_PROGRESS" && <><h3>{t("После сравнения с материалами", "After comparing with the materials")}</h3><div className="row"><ActionButton secondary label={t("Самопроверка выполнена", "Self-check complete")} action={async () => apply(await api<AttemptDto>(`attempts/${dto.id}/self-check?lang=${lang}`, "POST", { state: "SELF_CHECKED" }))} />
      <ActionButton secondary label={t("Мне нужно повторить", "I need to review this")} action={async () => apply(await api<AttemptDto>(`attempts/${dto.id}/self-check?lang=${lang}`, "POST", { state: "NEEDS_REPEAT" }))} /></div>
      {(s.selfCheckedAt || s.needsRepeat) && <StudyStatus state={s.needsRepeat ? "NEEDS_REPEAT" : "SELF_CHECKED"} helpUsed={Object.values(s.help).some(Boolean)} />}</>}
    <div className="row study-next">{s.lessonId && s.courseSlug && <ActionButton secondary label={t("К теме и истории", "Topic & history")} action={async()=>{ await save(); router.push(`/courses/${s.courseSlug}/topics/${s.lessonId}`); }} />}
      {next && <ActionButton label={t("Следующая задача", "Next task") + " →"} action={async () => { await save(); const a = await api<{ id: string }>(`study/start?lang=${lang}`, "POST", { taskId: next.taskId, lessonId: s.lessonId }); router.push(`/attempts/${a.id}`); }} />}</div>
  </section>;
}
