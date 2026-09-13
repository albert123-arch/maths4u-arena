"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttemptDto, workResults } from "@/lib/works";
import { api, ApiError, ErrorNotice, Heading, MathContent, useLocale, useResource } from "./ui";
import { FileViewer, type ViewFile } from "./file-viewer";

type Draft = { points: string; comment: string; revision: number };
function Reference({ html, files }: { html: string; files: ViewFile[] }) {
  const inline: ViewFile[] = [];
  const text = html.replace(/<img\b[^>]*src="\/api\/files\/([a-zA-Z0-9_-]+)"[^>]*>/g, (_tag, id) => {
    inline.push({ id, originalName: "MS / solution", mimeType: "image/png" }); return "";
  });
  return <><MathContent html={text} /><FileViewer key={[...inline, ...files].map(f => f.id).join()} files={[...inline, ...files]} /></>;
}
export function ReviewScreen({ initial }: { initial: AttemptDto }) {
  const { t, lang } = useLocale(), router = useRouter();
  const [dto, setDto] = useState(initial), [question, setQuestion] = useState(0), [part, setPart] = useState(0);
  const [panel, setPanel] = useState("answer"), [reference, setReference] = useState("ms");
  const [values, setValues] = useState<Record<string, Draft>>(() => Object.fromEntries(initial.answers.map(a => [a.partId, { points: a.points == null ? "" : String(a.points), comment: a.comment ?? "", revision: a.reviewRevision ?? 0 }])));
  const drafts = useRef(values), dirty = useRef(new Set<string>()), saving = useRef<Promise<boolean> | null>(null);
  const [state, setState] = useState<"saved" | "dirty" | "saving" | "error">("saved"), [error, setError] = useState<unknown>(null);
  const results = useResource<Awaited<ReturnType<typeof workResults>>>(initial.manager ? `works/${initial.workId}/results` : null);
  async function flush(): Promise<boolean> {
    if (saving.current) { if (!await saving.current) return false; return flush(); }
    if (!dirty.current.size) return true;
    const snapshot = Object.fromEntries([...dirty.current].map(id => [id, { ...drafts.current[id] }]));
    const reviews = Object.entries(snapshot).map(([partId, d]) => ({ partId, points: d.points.trim() === "" ? null : Number(d.points), comment: d.comment, revision: d.revision }));
    if (reviews.some(r => r.points !== null && (!Number.isFinite(r.points) || r.points < 0))) { setError(new ApiError("INVALID_POINTS", 400)); setState("error"); return false; }
    setState("saving");
    const operation = (async () => {
      try {
        await api(`attempts/${dto.id}/review`, "POST", { reviews });
        for (const [id, value] of Object.entries(snapshot)) {
          const current = drafts.current[id];
          if (current.points === value.points && current.comment === value.comment) dirty.current.delete(id);
          drafts.current[id] = { ...current, revision: value.revision + 1 };
        }
        setValues({ ...drafts.current }); setError(null); setState(dirty.current.size ? "dirty" : "saved"); return true;
      } catch (e) { setError(e); setState("error"); return false; }
    })();
    saving.current = operation; const ok = await operation; saving.current = null; return ok;
  }
  const flushRef = useRef(flush);
  const pauseAutosave = useRef(false);
  useEffect(() => { pauseAutosave.current = state === "error"; }, [state]);
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => {
    const timer = setInterval(() => { if (!pauseAutosave.current) void flushRef.current(); }, 1000);
    const warning = (e: BeforeUnloadEvent) => { if (dirty.current.size) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warning);
    return () => { clearInterval(timer); window.removeEventListener("beforeunload", warning); };
  }, []);
  useEffect(() => { let closed = false;
    void api<AttemptDto>(`attempts/${initial.id}?lang=${lang}`).then(next => { if (!closed) setDto(next); }).catch(setError);
    return () => { closed = true; };
  }, [initial.id, lang]);
  function update(id: string, patch: Partial<Draft>) { drafts.current = { ...drafts.current, [id]: { ...drafts.current[id], ...patch } }; dirty.current.add(id); setValues(drafts.current); setState("dirty"); }
  async function leave(url: string) { if (await flush()) { if (dirty.current.size && !await flush()) return; router.push(url); } }
  async function selectQuestion(index: number) { if (await flush()) { setQuestion(index); setPart(0); } }
  if (!dto.manager) return <ErrorNotice error={new ApiError("FORBIDDEN", 403)} />;
  const q = dto.questions[question], p = q.parts[part], answer = dto.answers.find(a => a.partId === p.id), draft = values[p.id] ?? { points: "", comment: "", revision: 0 };
  const peers = results.data?.filter(a => a.status !== "IN_PROGRESS") ?? [], peer = peers.findIndex(a => a.id === dto.id), next = peer >= 0 ? peers[peer + 1] : undefined;
  const referenceFiles = q.assets.filter(a => a.role === (reference === "ms" ? "MARK_SCHEME" : "SOLUTION")).map(a => ({ ...a, originalName: a.caption || a.role }));
  const labels = { answer: t("Ответ", "Answer"), ms: "MS", grade: t("Оценка", "Grade") };
  const tabs = [{ id: "ms", label: "MS", exists: !!q.markScheme || q.assets.some(a => a.role === "MARK_SCHEME") }, { id: "solution", label: t("Подробное решение", "Detailed solution"), exists: !!q.solution || q.assets.some(a => a.role === "SOLUTION") }, { id: "criteria", label: t("Критерии", "Criteria"), exists: !!p.rubric || !!p.answer }];
  return <div className="review-screen"><Heading title={dto.title} subtitle={t("Проверка работы", "Review submission")}><button className="secondary" onClick={() => void leave(`/works/${dto.workId}/results`)}>{t("К результатам", "Results")}</button></Heading>
    <div className="review-nav row spread"><div className="row"><button className="secondary" disabled={!question} onClick={() => void selectQuestion(question - 1)}>←</button><span>{t("Задача", "Problem")} {question + 1} / {dto.questions.length}</span><button className="secondary" disabled={question + 1 >= dto.questions.length} onClick={() => void selectQuestion(question + 1)}>→</button>
      <select aria-label={t("Часть задачи", "Question part")} value={part} onChange={e => { const index = Number(e.target.value); void flush().then(ok => { if (ok) setPart(index); }); }}>{q.parts.map((p, i) => <option key={p.id} value={i}>{t("Часть", "Part")} {i + 1} · {p.maxPoints} {t("балл.", "pts")}</option>)}</select></div>
      <span role="status">{state === "saved" ? t("Сохранено", "Saved") : state === "saving" ? t("Сохраняется…", "Saving…") : state === "error" ? t("Ошибка сохранения", "Save failed") : t("Есть изменения", "Unsaved changes")}</span>
      {next && <button className="secondary" onClick={() => void leave(`/attempts/${next.id}/review`)}>{t("Следующий ученик", "Next student")} →</button>}</div>
    <ErrorNotice error={error} />
    <details className="card statement-details"><summary>{t("Условие", "Statement")} · {q.title}</summary><MathContent html={q.statement} /><MathContent html={p.prompt} /></details>
    {dto.status === "IN_PROGRESS" && <p className="notice">{t("Проверка доступна после сдачи или окончания времени.", "Review is available after submission or timeout.")}</p>}
    <div className="review-mobile-tabs">{Object.entries(labels).map(([id, label]) => <button key={id} className={panel === id ? "" : "secondary"} aria-pressed={panel === id} onClick={() => setPanel(id)}>{label}</button>)}</div>
    <div className="review-layout" data-panel={panel}>
      <section className="card review-answer"><h2>{t("Ответ ученика", "Student answer")}</h2><p className="written-answer">{String((answer?.response as { value?: string } | undefined)?.value ?? "")}</p>
        {p.kind === "CHOICE" && <MathContent html={p.options.find(o => o.id === (answer?.response as { optionId?: string })?.optionId)?.text ?? ""} />}
        <FileViewer key={p.id} files={answer?.files ?? []} />{!answer?.files.length && <p className="muted">{t("Вложений нет", "No attachments")}</p>}</section>
      <section className="card review-reference"><div className="reference-tabs row">{tabs.map(tab => <button key={tab.id} className={reference === tab.id ? "" : "secondary"} onClick={() => setReference(tab.id)} aria-pressed={reference === tab.id}>{tab.label}</button>)}</div>
        {!tabs.find(tab => tab.id === reference)?.exists ? <p className="empty">{t("Этот материал не предоставлен источником.", "This material was not provided by the source.")}</p> : reference === "criteria" ? <><MathContent html={p.answer ?? ""} /><MathContent html={p.rubric ?? ""} /></> : <Reference html={(reference === "ms" ? q.markScheme : q.solution) ?? ""} files={referenceFiles} />}
        {reference === "ms" && q.markSchemeSource && <p className="muted">{t("Источник: ", "Source: ")}{q.markSchemeSource}</p>}
        {q.teacherNote && <details><summary>{t("Заметка учителю", "Teacher note")}</summary><MathContent html={q.teacherNote} /></details>}</section>
      <section className="card review-grade"><h2>{t("Оценка и комментарий", "Marks & feedback")}</h2><div className="field-grid">
        <label>{t("Баллы (пусто — не проверено)", "Points (blank means ungraded)")} · 0–{p.maxPoints}<input aria-label={t("Баллы", "Points")} type="number" min={0} max={p.maxPoints} step="any" value={draft.points} disabled={dto.status === "IN_PROGRESS"} onChange={e => update(p.id, { points: e.target.value })} /></label>
        <label>{t("Комментарий ученику", "Feedback for student")}<textarea aria-label={t("Комментарий ученику", "Feedback for student")} value={draft.comment} maxLength={10000} disabled={dto.status === "IN_PROGRESS"} onChange={e => update(p.id, { comment: e.target.value })} /></label></div>
        <button disabled={state === "saving" || dto.status === "IN_PROGRESS"} onClick={() => void flush()}>{t("Сохранить", "Save")}</button><p className="muted">{t("Публикация результатов выполняется отдельно в настройках работы.", "Result release is controlled separately by the work settings.")}</p></section>
    </div></div>;
}
