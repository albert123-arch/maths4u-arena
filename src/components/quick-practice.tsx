"use client";
import Link from "next/link";
import { useState } from "react";
import type { CatalogDto } from "@/lib/catalog";
import type { AttemptDto } from "@/lib/works";
import { api, ApiError, ErrorNotice, MathContent, useLocale } from "./ui";

type Task = CatalogDto["items"][number];
export function QuickPractice({ task, lessonId, changed }: { task: Task; lessonId?: string; changed: () => void }) {
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
      if (current.status !== "IN_PROGRESS") { setResult(current); changed(); return; }
      if (current.questions[0].parts.some(p => !task.version.parts.some(part => part.id === p.id))) throw new ApiError("QUESTION_CHANGED", 409);
      const next = await api<AttemptDto>(`attempts/${current.id}/submit?lang=${lang}`, "POST", { revision: current.revision,
        answers: task.version.parts.map(p => ({ partId: p.id, response: responses[p.id] })) });
      setResult(next); changed();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function reveal(kind: "answer" | "solution") {
    if (!result) return;
    setBusy(true); setError(null);
    try { setResult(await api<AttemptDto>(`attempts/${result.id}/help?lang=${lang}`, "POST", { kind })); changed(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }
  if (task.progress?.state === "IN_PROGRESS" && !attemptId) return <Link className="button" href={`/attempts/${task.progress.attemptId}`}>{t("Продолжить сохранённый ответ", "Continue saved answer")} →</Link>;
  return <div className="quick-practice"><form onSubmit={e => { e.preventDefault(); void check(); }}>
    {task.version.parts.map((p, index) => <fieldset key={p.id} disabled={busy || !!result}><legend>{t("Ваш ответ", "Your answer")}{task.version.parts.length > 1 ? ` · ${index + 1}` : ""}</legend>
      {p.prompt && <MathContent html={p.prompt} />}
      {p.kind === "CHOICE" ? p.options.map(o => <label className="quick-choice" key={o.id}><input required type="radio" name={`choice-${p.id}`} value={o.id} checked={responses[p.id]?.optionId === o.id} onChange={() => update(p.id, "", o.id)} /><MathContent html={o.text} /></label>)
        : <label>{t("Короткий ответ", "Short answer")}<input required type="text" inputMode={p.kind === "NUMERIC" ? "decimal" : "text"} value={responses[p.id]?.value ?? ""} onChange={e => update(p.id, e.target.value)} /></label>}
    </fieldset>)}
    {!result && <><p className="muted">{t("Ответ сохранится после проверки.", "Your answer is saved when you check it.")}</p><button type="submit" disabled={busy}>{busy ? t("Проверка…", "Checking…") : t("Проверить ответ", "Check answer")}</button></>}
  </form><ErrorNotice error={error} />{!!error && attemptId && <Link href={`/attempts/${attemptId}`}>{t("Открыть сохранённую попытку", "Open saved attempt")} →</Link>}
    {result && <div className="quick-result" role="status"><strong>{result.resultVisible && result.score !== undefined ? `${result.score === result.maxPoints ? t("Верно", "Correct") : t("Попробуйте ещё раз", "Have another go")} · ${result.score} / ${result.maxPoints}` : t("Ответ отправлен", "Answer submitted")}</strong>
      <div className="row"><button className="secondary" disabled={busy} onClick={() => { setResult(null); setAttemptId(null); setResponses({}); }}>{t("Новая попытка", "Try again")}</button>
        {result.questions[0].availableHelp?.answer && <button className="secondary" disabled={busy} onClick={() => void reveal("answer")}>{t("Показать ответ", "Show answer")}</button>}
        {result.questions[0].availableHelp?.solution && <button className="secondary" disabled={busy} onClick={() => void reveal("solution")}>{t("Показать решение", "Show solution")}</button>}
        <Link href={`/attempts/${result.id}`}>{t("Мой ответ и подробности", "My answer & details")} →</Link>
      </div>{result.questions[0].answer && <MathContent html={result.questions[0].answer} />}{result.questions[0].parts.map(p => p.answer ? <MathContent key={p.id} html={p.answer} /> : null)}{result.questions[0].solution && <MathContent html={result.questions[0].solution} />}
    </div>}
  </div>;
}
