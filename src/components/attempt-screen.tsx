"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AttemptDto } from "@/lib/works";
import { useLocale, useResource, Heading, Loading, ErrorNotice, MathContent, MaterialAsset, Status, api, ApiError, Form, DateLabel } from "./ui";
type ResponseValue = { value: string; optionId?: string };

export function AttemptScreen({ id, review }: { id: string; review: boolean }) {
  const r = useResource<AttemptDto>("attempts/" + id);
  if (r.error) return <ErrorNotice error={r.error} />;
  if (!r.data) return <Loading />;
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
  const apply = (next: AttemptDto) => { dtoRef.current = next; if (alive.current) setDto(next); };
  async function refresh() { const next = await api<AttemptDto>("attempts/" + initial.id + "?lang=" + lang); apply(next); }
  async function flush(submit: boolean) {
    if (busy.current) { await busy.current; if (submit) return flush(true); return; }
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
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty.current.size) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener("beforeunload", beforeUnload); };
  }, [offset]);
  useEffect(() => {
    let cancelled = false;
    api<AttemptDto>("attempts/" + initial.id + "?lang=" + lang).then(next => { if (!cancelled) { dtoRef.current = next; setDto(next); } }).catch(setError);
    return () => { cancelled = true; };
  }, [lang, initial.id]);
  function change(partId: string, value: ResponseValue) {
    drafts.current = { ...drafts.current, [partId]: value }; dirty.current.add(partId); setSavedAt(null); setResponses(drafts.current);
  }
  return <><Heading title={dto.title} subtitle={t("Попытка ", "Attempt ") + dto.number}><Link className="button secondary" href={"/works/" + dto.workId + (review ? "/results" : "")}>{t("К работе", "Back to work")}</Link></Heading>
    <div className="work-toolbar row spread"><div className="row"><Status value={dto.status} />{!readOnly && <span className="timer" aria-label={t("Осталось времени", "Time remaining")}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>}</div><div className="row"><span className="muted" role="status">{saving ? t("Сохранение…", "Saving…") : savedAt ? t("Сохранено ", "Saved ") + savedAt.toLocaleTimeString() : !finished ? t("Ответы сохраняются автоматически", "Answers save automatically") : dto.timedOut ? t("Время истекло", "Time expired") : ""}</span>
      {!readOnly && <button onClick={() => void flush(true)} disabled={saving || conflict}>{t("Отправить работу", "Submit work")}</button>}
      {finished && <button className="secondary" onClick={() => void refresh()}>{t("Обновить результат", "Refresh result")}</button>}</div></div>
    <ErrorNotice error={error} />
    {finished && !dto.resultVisible && <p className="notice">{t("Работа принята. Баллы, решения и комментарии станут доступны после публикации результатов.", "Your work was received. Marks, solutions and comments will be available when results are released.")}</p>}
    {dto.resultVisible && <div className="card tint" style={{ margin: "20px 0" }}><p className="eyebrow">{t("Результат", "Result")}</p><div className="metric">{dto.score} <span className="muted" style={{ fontSize: 20 }}>/ {dto.maxPoints}</span></div>{dto.pendingReview && <p className="muted">{t("Часть ответов ещё ожидает проверки. Баллы пока предварительные.", "Some answers are awaiting review. This score is provisional.")}</p>}{dto.submittedAt && <p className="muted"><DateLabel value={dto.submittedAt} /></p>}</div>}
    <div className="stack">{dto.questions.map((q, qi) => <article className="card" key={q.id}><p className="eyebrow">{t("Задача ", "Problem ")}{qi + 1}</p><h2>{q.title}</h2><MathContent html={q.statement} />
      {q.assets.filter(a => a.role === "STATEMENT").map(a => <MaterialAsset key={a.id} asset={a} />)}
      {q.parts.map((p, pi) => { const answer = dto.answers.find(a => a.partId === p.id), response = responses[p.id] ?? { value: "" }; return <section className="part" key={p.id}>
        <div className="row spread"><strong>{t("Часть ", "Part ")}{pi + 1}</strong><span className="muted">{p.maxPoints} {t("балл.", "pts")}</span></div>
        <MathContent html={p.prompt} />
        {p.kind === "CHOICE" ? <div className="stack" style={{ marginTop: 14 }}>{p.options.map(o => <label className="check choice" key={o.id}><input type="radio" name={p.id} checked={response.optionId === o.id} disabled={readOnly} onChange={() => change(p.id, { value: "", optionId: o.id })} /><MathContent html={o.text} />{o.correct !== undefined && o.correct && <span>✓</span>}</label>)}</div> :
          <label style={{ marginTop: 14 }}>{t("Ваш ответ", "Your answer")}{p.kind === "MANUAL" ? <textarea aria-label={t("Ваш ответ", "Your answer")} value={response.value} readOnly={readOnly} onChange={e => change(p.id, { value: e.target.value })} placeholder={t("Запишите рассуждение или приложите файл решения…", "Write your reasoning or attach your solution…")} rows={5} /> : <input aria-label={t("Ваш ответ", "Your answer")} value={response.value} readOnly={readOnly} inputMode={p.kind === "NUMERIC" ? "decimal" : "text"} onChange={e => change(p.id, { value: e.target.value })} />}</label>}
        {!readOnly && dto.allowFiles && <label style={{ marginTop: 14 }}>{t("Фото / PDF решения · до 8 МБ, до 5 файлов", "Solution photo / PDF · up to 8 MB, 5 files")}<input type="file" accept=".png,.jpg,.jpeg,.pdf" disabled={saving} onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return;
          await flush(false); if (blocked.current) return; setSaving(true);
          const operation = (async () => {
            try { const f = new FormData(); f.set("file", file); f.set("attemptId", dto.id); f.set("partId", p.id); await api("files", "POST", f); await refresh(); setError(null); }
            catch (e) { setError(e); } finally { setSaving(false); }
          })();
          busy.current = operation; await operation; busy.current = null;
        }} /></label>}
        {answer?.files.map(f => <p key={f.id}><a href={"/api/files/" + f.id} className="attachment" target="_blank" rel="noopener noreferrer">{f.originalName} ↗</a></p>)}
        {dto.resultVisible && answer && <div className="notice" style={{ marginTop: 16 }}><strong>{t("Баллы: ", "Points: ")}{answer.points ?? t("ожидает проверки", "pending")} / {p.maxPoints}</strong>{answer.comment && <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{answer.comment}</p>}</div>}
        {p.answer !== undefined && <details style={{ marginTop: 16 }}><summary>{t("Ответ и критерии", "Answer & marking criteria")}</summary><MathContent html={p.answer} /><MathContent html={p.rubric ?? ""} /></details>}
      </section>; })}
      {q.solution !== undefined && <details className="part"><summary>{t("Решение и подсказка", "Solution & hint")}</summary><MathContent html={q.hint ?? ""} /><MathContent html={q.solution} />{q.assets.filter(a => a.role !== "STATEMENT").map(a => <MaterialAsset key={a.id} asset={a} />)}</details>}
      {review && q.teacherNote && <div className="notice" style={{ marginTop: 16 }}><strong>{t("Заметка учителю", "Teacher note")}</strong><MathContent html={q.teacherNote} /></div>}
    </article>)}</div>
    {review && <section className="card" style={{ marginTop: 24 }}><h2>{t("Оценка учителя", "Teacher review")}</h2>{!finished ? <p className="notice">{t("Проверка доступна после сдачи или окончания времени.", "Review becomes available after submission or timeout.")}</p> : <Form label={t("Сохранить оценку и комментарии", "Save marks & comments")} done={() => void refresh()} submit={f => api("attempts/" + dto.id + "/review", "POST", {
      reviews: dto.questions.flatMap(q => q.parts).map(p => ({ partId: p.id, points: Number(f.get("points-" + p.id)), comment: String(f.get("comment-" + p.id) ?? "") })),
    })}>{dto.questions.flatMap((q, qi) => q.parts.map((p, pi) => <div className="field-grid" key={p.id}><label>{t("Задача ", "Problem ")}{qi + 1}.{pi + 1} · {t("баллы", "points")} (0–{p.maxPoints})<input name={"points-" + p.id} type="number" min={0} max={p.maxPoints} step={0.25} required defaultValue={dto.answers.find(a => a.partId === p.id)?.points ?? 0} /></label><label>{t("Комментарий ученику", "Feedback for student")}<textarea name={"comment-" + p.id} defaultValue={dto.answers.find(a => a.partId === p.id)?.comment ?? ""} /></label></div>))}</Form>}</section>}
  </>;
}
