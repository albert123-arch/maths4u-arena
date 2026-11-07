"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthoringStatus, AuthoringSubmissionDetailDto, AuthoringSubmissionListDto } from "@/lib/teacher-authoring-model";
import { Button, Input, Select, Textarea } from "./controls";
import { api, ApiError, DateLabel, ErrorNotice, Loading, MaterialAsset, MathContent, useResource } from "./ui";
import { useView } from "./view-state";

const labels: Record<AuthoringStatus, string> = { SUBMITTED: "Awaiting review", CHANGES_REQUESTED: "Changes requested", REJECTED: "Rejected", APPROVED: "Approved", WITHDRAWN: "Withdrawn" };
type Decision = "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
const decisions: Record<Decision, string> = { APPROVED: "Approve & publish", CHANGES_REQUESTED: "Return for changes", REJECTED: "Reject submission" };
const assetLabels: Record<string, string> = { STATEMENT: "Question", ANSWER: "Answer", HINT: "Hint", SOLUTION: "Worked solution", MARK_SCHEME: "Marking criteria", TEACHER: "Teacher resource" };

function SubmissionStatus({ value }: { value: AuthoringStatus }) {
  return <span className="tsq-badge" data-status={value}>{labels[value]}</span>;
}

function SavedMaterial({ submission }: { submission: AuthoringSubmissionDetailDto }) {
  const [locale, setLocale] = useState(submission.preview.locale);
  const preview = submission.previews.find(saved => saved.locale === locale) ?? submission.preview;
  const extraAssets = submission.material.assets.filter(asset => !preview.assets.some(saved => saved.id === asset.fileId) && !submission.teacherAssets.some(saved => saved.id === asset.fileId));
  return <section className="tsq-preview" aria-labelledby="tsq-preview-title">
    <div className="tsq-section-heading"><h3 id="tsq-preview-title">Submitted question</h3><span className="tsq-muted">Version {submission.versionNumber} · {preview.locale.toUpperCase()}</span></div>
    {submission.previews.length > 1 && <label className="tsq-language">Preview language<Select value={locale} onChange={event => setLocale(event.target.value as typeof locale)}>{submission.previews.map(saved => <option key={saved.locale} value={saved.locale}>{saved.locale === "en" ? "English" : saved.locale === "ru" ? "Russian" : saved.locale}</option>)}</Select></label>}
    <MathContent html={preview.statement} />
    {preview.assets.filter(asset => asset.role === "STATEMENT" && asset.partPosition == null).map(asset => <MaterialAsset key={asset.id} asset={{ ...asset, caption: asset.caption || "Question attachment" }} />)}
    {preview.parts.map((part, index) => <section key={part.id} className="tsq-part">
      <h4>Part {index + 1} <span className="tsq-muted">· {part.maxPoints} {part.maxPoints === 1 ? "mark" : "marks"} · {part.kind.toLowerCase()}</span></h4>
      <MathContent html={part.prompt} />
      {part.options.length > 0 && <ol className="tsq-options" type="A" aria-label={"Options for part " + (index + 1)}>{part.options.map(option => <li key={option.id}><MathContent html={option.text} />{option.correct && <span className="tsq-badge" data-status="APPROVED">Correct answer</span>}</li>)}</ol>}
      {preview.assets.filter(asset => asset.role === "STATEMENT" && asset.partPosition === index).map(asset => <MaterialAsset key={asset.id} asset={{ ...asset, caption: asset.caption || `Part ${index + 1} attachment` }} />)}
    </section>)}
    <details className="tsq-solutions" open><summary>Saved answers, solution & marking criteria</summary>
      {preview.answer && <section><h4>Answer</h4><MathContent html={preview.answer} /></section>}
      {preview.solution && <section><h4>Worked solution</h4><MathContent html={preview.solution} /></section>}
      {preview.hint && <section><h4>Hint</h4><MathContent html={preview.hint} /></section>}
      {preview.markScheme && <section><h4>Indicative marking criteria</h4><MathContent html={preview.markScheme} /></section>}
      {preview.markSchemeText && <section><h4>Additional marking text</h4><MathContent html={preview.markSchemeText} /></section>}
      {preview.parts.map((part, index) => <section key={part.id} className="tsq-part"><h4>Part {index + 1} · answer & criteria</h4>
        {part.answer ? <MathContent html={part.answer} /> : part.kind !== "CHOICE" && <p className="tsq-muted">No answer text supplied.</p>}
        {submission.material.parts[index]?.kind === "NUMERIC" && <p className="tsq-muted">Numeric key: {submission.material.parts[index].numericAnswer} · tolerance: {submission.material.parts[index].tolerance}</p>}
        {submission.material.parts[index]?.kind === "SHORT" && <><p className="tsq-muted">Accepted answers{!submission.material.parts[index].caseSensitive && " · case insensitive"}</p><ul>{submission.material.parts[index].acceptedAnswers.map((answer, answerIndex) => <li key={answerIndex}><code>{answer}</code></li>)}</ul></>}
        {part.rubric && <><h5>Indicative marking criteria</h5><MathContent html={part.rubric} /></>}
        {part.markScheme && <MathContent html={part.markScheme} />}{part.markSchemeText && <MathContent html={part.markSchemeText} />}
      </section>)}
      {preview.assets.filter(asset => asset.role !== "STATEMENT").map(asset => <div key={asset.id}><p className="tsq-muted">{assetLabels[asset.role]}{asset.partPosition != null ? ` · part ${asset.partPosition + 1}` : ""}</p><MaterialAsset asset={{ ...asset, caption: asset.caption || assetLabels[asset.role] }} /></div>)}
    </details>
    {extraAssets.length > 0 && <details><summary>All other submitted attachments ({extraAssets.length})</summary><ul className="tsq-file-list">{extraAssets.map((asset, index) => <li key={asset.fileId + ":" + index}><a href={"/api/files/" + encodeURIComponent(asset.fileId)} target="_blank" rel="noopener noreferrer">{asset.caption || assetLabels[asset.role]} ↗</a><span className="tsq-muted">{assetLabels[asset.role]}{asset.locale ? ` · ${asset.locale.toUpperCase()}` : ""}{asset.partPosition != null ? ` · part ${asset.partPosition + 1}` : ""}</span></li>)}</ul></details>}
    {(submission.teacherNotes.length > 0 || submission.teacherAssets.length > 0) && <details><summary>Author’s teacher notes & resources</summary>{submission.teacherNotes.map(note => <section key={note.locale}><h4>{note.locale.toUpperCase()}</h4><MathContent html={note.html} /></section>)}{submission.teacherAssets.map((asset, index) => <div key={asset.id + ":" + index}><p className="tsq-muted">Teacher resource{asset.partPosition != null ? ` · part ${asset.partPosition + 1}` : ""}</p><MaterialAsset asset={{ ...asset, caption: asset.caption || "Teacher resource" }} /></div>)}</details>}
  </section>;
}

function SubmissionDecision({ submission, saved, reload, loading }: { submission: AuthoringSubmissionDetailDto; saved: () => void; reload: () => void; loading: boolean }) {
  const lens = useView();
  const [decision, setDecision] = useState<Decision>("CHANGES_REQUESTED"), [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const stale = error instanceof ApiError && ["STALE_REVISION", "AUTHORING_DECISION_FINAL"].includes(error.code);
  const cannotApprove = submission.completeness.length > 0 || !submission.authorDeclaration || !submission.permissionToPublish;
  if (submission.status !== "SUBMITTED") return <section className="tsq-decision"><h3>Review outcome</h3>{submission.feedback && <p className="tsq-plain">{submission.feedback}</p>}<p className="tsq-muted">This submission is {labels[submission.status].toLowerCase()}. Its saved version remains available for review.</p></section>;
  return <form className="tsq-decision" onSubmit={async event => {
    event.preventDefault(); if (lens || busy || loading || stale || decision !== "APPROVED" && feedback.trim().length < 5 || decision === "APPROVED" && cannotApprove) return;
    setBusy(true); setError(null);
    try { await api("admin/teacher-submissions/" + encodeURIComponent(submission.id), "PATCH", { revision: submission.revision, status: decision, feedback }); saved(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }}><h3>Review decision</h3>
    {lens && <p className="notice" role="status">This viewing mode is read only. Exit it to record a decision.</p>}
    <label>Decision<Select value={decision} onChange={e => setDecision(e.target.value as Decision)} disabled={busy || loading || !!lens || stale}>{Object.entries(decisions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
    <p className="tsq-muted">{decision === "APPROVED" ? `Publishes submitted version ${submission.versionNumber} in the public library. Any newer private draft stays private.` : "Your feedback will be visible to the author. Explain what should change or why this submission is rejected."}</p>
    <label htmlFor="tsq-feedback">Feedback {decision === "APPROVED" ? "(optional)" : "(required)"}</label><Textarea id="tsq-feedback" rows={4} maxLength={4000} minLength={decision === "APPROVED" ? undefined : 5} required={decision !== "APPROVED"} value={feedback} onChange={e => setFeedback(e.target.value)} disabled={busy || loading || !!lens || stale} aria-describedby="tsq-feedback-help" placeholder="Record the checks you made and the outcome." />
    <p className="tsq-muted" id="tsq-feedback-help">{decision !== "APPROVED" && "At least 5 characters. "}{feedback.length.toLocaleString("en-GB")} / 4,000 characters</p>
    {cannotApprove && decision === "APPROVED" && <p className="notice error" role="alert">Approval requires complete answers, solutions, marking criteria and the author’s declarations. Return this submission for changes.</p>}
    {stale ? <p className="notice error" role="alert">This submission changed while you were reviewing it. Copy your feedback, reload the submission and review its current status.</p> : <ErrorNotice error={error} />}
    {!!error && <Button type="button" variant="outline" onClick={reload}>Reload current submission</Button>}
    <div className="tsq-actions"><Button variant="primary" type="submit" disabled={busy || loading || !!lens || stale || decision !== "APPROVED" && feedback.trim().length < 5 || decision === "APPROVED" && cannotApprove}>{busy ? "Saving decision…" : decisions[decision]}</Button><span className="tsq-muted">Review revision {submission.revision}</span></div>
  </form>;
}

function SubmissionDialog({ id, close, saved }: { id: string; close: () => void; saved: () => void }) {
  const r = useResource<AuthoringSubmissionDetailDto>("admin/teacher-submissions/" + encodeURIComponent(id));
  const dialog = useRef<HTMLDialogElement>(null), [updated, setUpdated] = useState(false);
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; if (previous?.isConnected && !previous.matches(":disabled")) previous.focus(); else document.querySelector<HTMLInputElement>(".tsq-search")?.focus(); };
  }, []);
  return <dialog ref={dialog} className="tsq-dialog" aria-labelledby="tsq-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target !== event.currentTarget) return; const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); }}>
    <header className="tsq-dialog-heading"><div><p className="tsq-muted">Teacher submission · exact saved version</p><h2 id="tsq-dialog-title">{r.data?.title ?? "Submission details"}</h2></div><Button variant="outline" onClick={close}>Close</Button></header>
    <ErrorNotice error={r.error} />{r.isLoading && <p className="tsq-muted" role="status">Loading submission…</p>}{!r.data ? !r.error && <Loading /> : <>
      <div className="tsq-actions"><SubmissionStatus value={r.data.status} /><span className="tsq-badge">Version {r.data.versionNumber}</span><span className="tsq-muted">{r.data.material.parts.reduce((sum, part) => sum + part.maxPoints, 0)} marks</span></div>
      <dl className="tsq-metadata"><div><dt>Author</dt><dd>{r.data.owner.displayName} <span className="tsq-muted">· {r.data.owner.username}</span></dd></div><div><dt>Submitted</dt><dd><DateLabel value={r.data.submittedAt} /></dd></div><div><dt>Suggested course</dt><dd>{r.data.courseTitle}</dd></div><div><dt>Suggested topic</dt><dd>{r.data.topicTitle}</dd></div><div><dt>Saved version ID</dt><dd><code>{r.data.taskVersionId}</code></dd></div><div><dt>Private task ID</dt><dd><code>{r.data.taskId}</code></dd></div></dl>
      {r.data.latestPrivateVersionId !== r.data.taskVersionId && <p className="tsq-warning" role="status">The author has a newer private version. This review and approval apply only to submitted version {r.data.versionNumber} shown here.</p>}
      <section className="tsq-declaration"><h3>Author’s declarations</h3><ul><li>{r.data.authorDeclaration ? "The author declared this question to be original work." : "No original-authorship declaration is recorded."}</li><li>{r.data.permissionToPublish ? "The author gave permission to publish this submitted version." : "Publication permission is not recorded."}</li></ul><p className="tsq-muted">Declaration: {r.data.declarationVersion}</p>{r.data.note && <><h4>Author’s note</h4><p className="tsq-plain">{r.data.note}</p></>}</section>
      {r.data.completeness.length > 0 && <section className="tsq-warning"><h3>Submission checks</h3><p>These required fields need attention:</p><ul>{r.data.completeness.map(item => <li key={item}><code>{item}</code></li>)}</ul></section>}
      <SavedMaterial submission={r.data} />
      {r.data.reviewer && <p className="tsq-muted">Reviewed by {r.data.reviewer.displayName}{r.data.reviewedAt && <> · <DateLabel value={r.data.reviewedAt} /></>}</p>}
      {r.data.publishedVersionId && <p className="tsq-muted">Published version ID: <code>{r.data.publishedVersionId}</code></p>}
      {updated && <p className="notice" role="status">Review decision saved.</p>}
      <SubmissionDecision key={r.data.id + ":" + r.data.revision} submission={r.data} saved={() => { setUpdated(true); r.refresh(); saved(); }} reload={r.refresh} loading={r.isLoading || !!r.error} />
    </>}
  </dialog>;
}

export function TeacherSubmissions() {
  const [status, setStatus] = useState("SUBMITTED"), [query, setQuery] = useState(""), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(25), [selected, setSelected] = useState<string | null>(null);
  const r = useResource<AuthoringSubmissionListDto>(`admin/teacher-submissions?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
  return <div className="tsq-workspace"><header className="tsq-page-heading"><h1>Teacher submissions</h1><p className="tsq-muted">Review original questions and publish the exact version submitted by the author.</p></header>
    {r.data && <div className="tsq-counts" aria-label="Submission status totals">{Object.entries(labels).map(([value, label]) => <Button key={value} variant="text" className="tsq-count" aria-pressed={status === value} onClick={() => { setStatus(status === value ? "" : value); setPage(1); }}><span>{label}</span><strong>{r.data!.counts[value as AuthoringStatus].toLocaleString("en-GB")}</strong></Button>)}</div>}
    <section className="tsq-list-card" aria-label="Submitted questions"><div className="tsq-filters"><label>Search submissions<Input className="tsq-search" type="search" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Question title or author" /></label><label>Status<Select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></label><label>Per page<Select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></Select></label></div>
      <ErrorNotice error={r.error} />{r.isLoading && <p className="tsq-muted" role="status">Loading submissions…</p>}
      {r.data && <><p className="tsq-muted tsq-result-count" role="status">{r.data.total.toLocaleString("en-GB")} {r.data.total === 1 ? "submission" : "submissions"}</p>{r.data.items.length > 0 ? <div className="tsq-list">{r.data.items.map(submission => <article key={submission.id} className="tsq-row"><div><div className="tsq-actions"><SubmissionStatus value={submission.status} /><span className="tsq-muted">Version {submission.versionNumber}</span></div><h2>{submission.title}</h2><p>{submission.courseTitle} <span aria-hidden="true">/</span> {submission.topicTitle}</p><p className="tsq-muted">{submission.owner.displayName} · {submission.owner.username} · <DateLabel value={submission.submittedAt} /></p></div><Button variant="outline" disabled={r.isLoading} onClick={() => setSelected(submission.id)} aria-label={"Review submission: " + submission.title}>{submission.status === "SUBMITTED" ? "Review submission" : "View submission"}</Button></article>)}</div> : <p className="tsq-empty">{query || status ? "No submissions match these filters." : "No teacher questions have been submitted yet."}</p>}
        <nav className="tsq-pagination" aria-label="Submission pages"><Button variant="outline" disabled={r.isLoading || r.data.page <= 1} onClick={() => setPage(Math.max(1, r.data!.page - 1))}>Previous</Button><span className="tsq-muted">Page {r.data.page} of {r.data.pages}</span><Button variant="outline" disabled={r.isLoading || r.data.page >= r.data.pages} onClick={() => setPage(r.data!.page + 1)}>Next</Button></nav></>}
    </section>{selected && <SubmissionDialog key={selected} id={selected} close={() => setSelected(null)} saved={r.refresh} />}
  </div>;
}
