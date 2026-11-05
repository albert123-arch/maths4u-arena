"use client";
import { Button, ButtonLink, Input } from "./controls";
import Link from "next/link";
import { Feedback } from "./feedback";
import { useState } from "react";
import type { CatalogDto } from "@/lib/catalog";
import type { AttemptDto } from "@/lib/works";
import { api, ApiError, ErrorNotice, MathContent, useLocale } from "./ui";

type Task = CatalogDto["items"][number];
export function QuickPractice({ task, lessonId, changed, onAttempt }: { task: Task; lessonId?: string; changed: () => void; onAttempt?:()=>void }) {
  const { t, lang } = useLocale(), [responses, setResponses] = useState<Record<string, { value: string; optionId?: string }>>({});
  const [result, setResult] = useState<AttemptDto | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const update = (id: string, value: string, optionId?: string) => setResponses(r => ({ ...r, [id]: { value, ...(optionId ? { optionId } : {}) } }));
  async function check() {
    setBusy(true); setError(null);
    try {
      const id = attemptId ?? (await api<{ id: string }>(`study/start?lang=${lang}`, "POST", { taskId: task.id, lessonId })).id;
      setAttemptId(id);
      const current = await api<AttemptDto>(`attempts/${id}?lang=${lang}`);
      if (current.status !== "IN_PROGRESS") { setResult(current); onAttempt?.(); changed(); return; }
      if (current.questions[0].parts.some(p => !task.version.parts.some(part => part.id === p.id))) throw new ApiError("QUESTION_CHANGED", 409);
      const next = await api<AttemptDto>(`attempts/${current.id}/submit?lang=${lang}`, "POST", { revision: current.revision,
        answers: task.version.parts.map(p => ({ partId: p.id, response: responses[p.id] })) });
      setResult(next); onAttempt?.(); changed();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  if (task.progress?.state === "IN_PROGRESS" && !attemptId) return <ButtonLink className="button" href={`/attempts/${task.progress.attemptId}`}>{t("Продолжить сохранённый ответ", "Continue saved answer")} →</ButtonLink>;
  return <div className="quick-practice"><form onSubmit={e => { e.preventDefault(); void check(); }}>
    {task.version.parts.map((p, index) => <fieldset key={p.id} disabled={busy || !!result}><legend>{t("Ваш ответ", "Your answer")}{task.version.parts.length > 1 ? ` · ${index + 1}` : ""}</legend>
      {p.prompt && <MathContent html={p.prompt} />}
      {p.kind === "CHOICE" ? p.options.map(o => <label className="quick-choice" key={o.id}><Input required type="radio" name={`choice-${p.id}`} value={o.id} checked={responses[p.id]?.optionId === o.id} onChange={() => update(p.id, "", o.id)} /><MathContent html={o.text} /></label>)
        : <label>{p.answerFormat ? t("Число или дробь", "Number or fraction") : t("Короткий ответ", "Short answer")}<Input required type="text" inputMode={p.kind === "NUMERIC" && !p.answerFormat ? "decimal" : "text"} value={responses[p.id]?.value ?? ""} onChange={e => update(p.id, e.target.value)} /></label>}
    </fieldset>)}
    {!result && <><p className="muted">{t("Ответ сохранится после проверки.", "Your answer is saved when you check it.")}</p><Button type="submit" disabled={busy}>{busy ? t("Проверка…", "Checking…") : t("Проверить ответ", "Check answer")}</Button></>}
  </form><ErrorNotice error={error} />{!!error && attemptId && <Link href={`/attempts/${attemptId}`}>{t("Открыть сохранённую попытку", "Open saved attempt")} →</Link>}
    {result && <div className="quick-result">{result.resultVisible && result.score !== undefined ? <Feedback kind={result.score === result.maxPoints ? "correct" : "again"}>{result.score} / {result.maxPoints}</Feedback> : <div className="notice" role="status">{t("Ответ отправлен", "Answer submitted")}</div>}
      <div className="row"><Button className="secondary" disabled={busy} onClick={() => { setResult(null); setAttemptId(null); setResponses({}); }}>{t("Новая попытка", "Try again")}</Button>
        <Link href={`/attempts/${result.id}`}>{t("Мой ответ и подробности", "My answer & details")} →</Link>
        <Link href="/#pure1-review">{t("План повторения", "My review plan")} →</Link>
      </div>
    </div>}
  </div>;
}
