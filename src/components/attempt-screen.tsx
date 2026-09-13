"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AttemptDto } from "@/lib/works";
import { useLocale, useResource, Heading, Loading, ErrorNotice, MathContent, MaterialAsset, Status, api, ApiError, DateLabel } from "./ui";
import { ReviewScreen } from "./review-screen";
import { StudyActions } from "./study-panel";
import { AnswerAttachments } from "./answer-attachments";
type ResponseValue = { value: string; optionId?: string };

export function AttemptScreen({ id, review }: { id: string; review: boolean }) {
  const r = useResource<AttemptDto>("attempts/" + id);
  if (r.error) return <ErrorNotice error={r.error} />;
  if (!r.data) return <Loading />;
  if (review) return <ReviewScreen key={id} initial={r.data} />;
  return <AttemptForm key={id + String(review)} initial={r.data} review={review} />;
}
function AttemptForm({ initial, review }: { initial: AttemptDto; review: boolean }) {
  const { t, lang } = useLocale();
  const [dto, setDto] = useState(initial), dtoRef = useRef(initial);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(() => Object.fromEntries(initial.answers.map(a => [a.partId, a.response as ResponseValue])));
  const drafts = useRef(responses), dirty = useRef(new Set<string>()), busy = useRef<Promise<void> | null>(null), blocked = useRef(false);
  const [saving, setSaving] = useState(false), [error, setError] = useState<unknown>(null), [savedAt, setSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now()), [offset] = useState(() => new Date(initial.serverTime).getTime() - Date.now());
  const [conflict, setConflict] = useState(false);
  const alive = useRef(true);
  const finished = dto.status !== "IN_PROGRESS", readOnly = finished || review;
  const remaining = Math.max(0, Math.ceil((new Date(dto.expiresAt).getTime() - now - offset) / 1000));
  const apply = (next: AttemptDto) => { if (next.revision < dtoRef.current.revision) return; dtoRef.current = next; if (alive.current) setDto(next); };
  async function refresh() { const next = await api<AttemptDto>("attempts/" + initial.id + "?lang=" + lang); apply(next); }
  async function flush(submit: boolean) {
    if (busy.current) { await busy.current; return flush(submit); }
    if (blocked.current || dtoRef.current.status !== "IN_PROGRESS" || review || (!submit && !dirty.current.size)) return;
    const snapshot = Object.fromEntries([...dirty.current].map(id => [id, drafts.current[id]]));
    setSaving(true);
    const operation = (async () => {
      try {
        const next = await api<AttemptDto>("attempts/" + initial.id + (submit ? "/submit" : "/save") + "?lang=" + lang, "POST", {
          revision: dtoRef.current.revision, answers: Object.entries(snapshot).map(([partId, response]) => ({ partId, response })),
        });
        for (const id of Object.keys(snapshot)) if (JSON.stringify(snapshot[id]) === JSON.stringify(drafts.current[id])) dirty.current.delete(id);
        apply(next); if (alive.current) { setError(null); setSavedAt(dirty.current.size ? null : new Date()); }
      } catch (e) {
        if (e instanceof ApiError && ["TIME_EXPIRED", "ATTEMPT_FINISHED"].includes(e.code)) { await refresh(); dirty.current.clear(); }
        if (e instanceof ApiError && e.code === "STALE_REVISION") { blocked.current = true; setConflict(true); }
        if (alive.current) setError(e);
      } finally { if (alive.current) setSaving(false); }
    })();
    busy.current = operation;
    await operation;
    busy.current = null;
  }
  const flushRef = useRef(flush);
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => {
      setNow(Date.now());
      const expired = new Date(dtoRef.current.expiresAt).getTime() <= Date.now() + offset;
      void flushRef.current(expired);
    }, 1000);
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty.current.size || busy.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener("beforeunload", beforeUnload); };
  }, [offset]);
  useEffect(() => {
    let cancelled = false;
    api<AttemptDto>("attempts/" + initial.id + "?lang=" + lang).then(next => { if (!cancelled && next.revision >= dtoRef.current.revision) { dtoRef.current = next; setDto(next); } }).catch(setError);
    return () => { cancelled = true; };
  }, [lang, initial.id]);
  async function mutateFiles(operation: () => Promise<unknown>) {
    await flush(false);
    while (busy.current) await busy.current;
    if (dirty.current.size) throw new ApiError("UNSAVED_ANSWERS", 409);
    if (blocked.current || dtoRef.current.status !== "IN_PROGRESS") throw new ApiError("ATTEMPT_FINISHED", 409);
    setSaving(true);
    const promise = (async () => { try { await operation(); } finally { await refresh(); } })();
    busy.current = promise;
    try { await promise; } finally { busy.current = null; setSaving(false); }
  }
  function change(partId: string, value: ResponseValue) {
    drafts.current = { ...drafts.current, [partId]: value }; dirty.current.add(partId); setSavedAt(null); setResponses(drafts.current);
  }
  return <><Heading title={dto.title} subtitle={t("Попытка ", "Attempt ") + dto.number}><Link className="button secondary" href={"/works/" + dto.workId + (review ? "/results" : "")}>{t("К работе", "Back to work")}</Link></Heading>
    <div className="work-toolbar row spread"><div className="row"><Status value={dto.status} />{!readOnly && !dto.study && <span className="timer" aria-label={t("Осталось времени", "Time remaining")}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>}</div><div className="row"><span className="muted" role="status">{saving ? t("Сохранение…", "Saving…") : savedAt ? t("Сохранено ", "Saved ") + savedAt.toLocaleTimeString() : !finished ? t("Ответы сохраняются автоматически", "Answers save automatically") : dto.timedOut ? t("Время истекло", "Time expired") : ""}</span>
      {!readOnly && <button onClick={() => void flush(true)} disabled={saving || conflict}>{t("Отправить работу", "Submit work")}</button>}
      {finished && <button className="secondary" onClick={() => void refresh()}>{t("Обновить результат", "Refresh result")}</button>}</div></div>
    <ErrorNotice error={error} />
    {dto.study && <StudyActions dto={dto} apply={apply} save={async () => { await flush(false); if (blocked.current || dirty.current.size) throw new ApiError("STALE_REVISION", 409); }} />}
    {finished && !dto.resultVisible && <p className="notice">{t("Работа принята. Баллы, решения и комментарии станут доступны после публикации результатов.", "Your work was received. Marks, solutions and comments will be available when results are released.")}</p>}
    {dto.resultVisible && <div className="card tint" style={{ margin: "20px 0" }}><p className="eyebrow">{t("Результат", "Result")}</p><div className="metric">{dto.study && dto.pendingReview ? t("Без оценки", "Ungraded") : dto.score} {!(dto.study && dto.pendingReview) && <span className="muted" style={{ fontSize: 20 }}>/ {dto.maxPoints}</span>}</div>{dto.pendingReview && <p className="muted">{dto.study ? t("Ручная задача: автоматическая оценка не выставляется. Самопроверка хранится отдельно.", "Written solution: no automatic mark is awarded. Self-checking is recorded separately.") : t("Часть ответов ещё ожидает проверки. Баллы пока предварительные.", "Some answers are awaiting review. This score is provisional.")}</p>}{dto.submittedAt && <p className="muted"><DateLabel value={dto.submittedAt} /></p>}</div>}
    <div className="stack">{dto.questions.map((q, qi) => <article className="card" key={q.id}><p className="eyebrow">{t("Задача ", "Problem ")}{qi + 1}</p><h2>{q.title}</h2><MathContent html={q.statement} />
      {q.assets.filter(a => a.role === "STATEMENT").map(a => <MaterialAsset key={a.id} asset={a} />)}
      {q.parts.map((p, pi) => { const answer = dto.answers.find(a => a.partId === p.id), response = responses[p.id] ?? { value: "" }; return <section className="part" key={p.id}>
        <div className="row spread"><strong>{t("Часть ", "Part ")}{pi + 1}</strong><span className="muted">{p.maxPoints} {t("балл.", "pts")}</span></div>
        <MathContent html={p.prompt} />
        {p.kind === "CHOICE" ? <div className="stack" style={{ marginTop: 14 }}>{p.options.map(o => <label className="check choice" key={o.id}><input type="radio" name={p.id} checked={response.optionId === o.id} disabled={readOnly} onChange={() => change(p.id, { value: "", optionId: o.id })} /><MathContent html={o.text} />{o.correct !== undefined && o.correct && <span>✓</span>}</label>)}</div> :
          <label style={{ marginTop: 14 }}>{t("Ваш ответ", "Your answer")}{p.kind === "MANUAL" ? <textarea aria-label={t("Ваш ответ", "Your answer")} value={response.value} readOnly={readOnly} onChange={e => change(p.id, { value: e.target.value })} placeholder={t("Запишите рассуждение или приложите файл решения…", "Write your reasoning or attach your solution…")} rows={5} /> : <input aria-label={t("Ваш ответ", "Your answer")} value={response.value} readOnly={readOnly} inputMode={p.kind === "NUMERIC" ? "decimal" : "text"} onChange={e => change(p.id, { value: e.target.value })} />}</label>}
        {(dto.allowFiles || !!answer?.files.length) && <AnswerAttachments files={answer?.files ?? []} attemptId={dto.id} partId={p.id} readOnly={readOnly || !dto.allowFiles} mutate={mutateFiles} />}
        {dto.resultVisible && answer && <div className="notice" style={{ marginTop: 16 }}><strong>{t("Баллы: ", "Points: ")}{answer.points ?? t("ожидает проверки", "pending")} / {p.maxPoints}</strong>{answer.comment && <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{answer.comment}</p>}</div>}
        {p.answer && <details open={!!dto.study} style={{ marginTop: 16 }}><summary>{t("Краткий ответ", "Short answer")}</summary><MathContent html={p.answer} /></details>}{p.rubric && <details open={!!dto.study} style={{ marginTop: 16 }}><summary>{t("Критерии части", "Part criteria")}</summary><MathContent html={p.rubric} /></details>}
      </section>; })}
      {([{ html: q.hint, label: t("Подсказка", "Hint"), role: "HINT" }, { html: q.solution, label: t("Подробное решение", "Detailed solution"), role: "SOLUTION" }, { html: q.markScheme, label: "MS", role: "MARK_SCHEME" }]).filter(m => m.html || q.assets.some(a => a.role === m.role)).map(m => <details className="part" key={m.role} open={!!dto.study}><summary>{m.label}</summary><MathContent html={m.html ?? ""} />{q.assets.filter(a => a.role === m.role).map(a => <MaterialAsset key={a.id} asset={a} />)}</details>)}

      {review && q.teacherNote && <div className="notice" style={{ marginTop: 16 }}><strong>{t("Заметка учителю", "Teacher note")}</strong><MathContent html={q.teacherNote} /></div>}
    </article>)}</div>
  </>;
}
