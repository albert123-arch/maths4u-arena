"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskReportStatus as ReportStatus, TaskReportListDto as ReportList, TaskReportDetailDto as ReportDetail } from "@/lib/task-report-model";
import { Button, Input, Select, Textarea } from "./controls";
import { api, ApiError, DateLabel, ErrorNotice, Loading, MaterialAsset, MathContent, useResource } from "./ui";
import { useView } from "./view-state";

const statusLabels: Record<ReportStatus, string> = { OPEN: "Open", IN_REVIEW: "In review", RESOLVED: "Resolved", DISMISSED: "Dismissed" };
const categoryLabels: Record<string, string> = { QUESTION: "Question", ANSWER: "Answer", SOLUTION: "Solution", DIAGRAM: "Diagram", FORMATTING: "Formatting", OTHER: "Other" };

function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className="arena-admin-badge" data-tone={status === "OPEN" ? "warning" : status === "IN_REVIEW" ? "hint" : status === "RESOLVED" ? "success" : undefined}>{statusLabels[status]}</span>;
}

function restoreReportFocus(previous: HTMLElement | null) {
  if (previous?.isConnected && !previous.matches(":disabled")) { previous.focus(); return; }
  const fallback = document.querySelector<HTMLInputElement>('.arena-admin-reports input[type="search"]');
  fallback?.focus();
  if (!previous?.isConnected) return;
  const waitingFocus = document.activeElement;
  // The list refresh can temporarily disable the original Open report button.
  // Restore it when ready, unless the user has already continued elsewhere.
  const observer = new MutationObserver(() => {
    if (!previous.isConnected) { stop(); return; }
    if (!previous.matches(":disabled")) {
      stop();
      if (document.activeElement === waitingFocus || document.activeElement === document.body) previous.focus();
    }
  });
  const timeout = window.setTimeout(stop, 15000);
  function stop() {
    observer.disconnect(); window.clearTimeout(timeout);
    document.removeEventListener("keydown", stop, true); document.removeEventListener("pointerdown", stop, true);
  }
  observer.observe(previous.closest(".arena-admin-reports") ?? document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled"] });
  document.addEventListener("keydown", stop, true); document.addEventListener("pointerdown", stop, true);
}

function ReportEditor({ report, saved, reload }: { report: ReportDetail; saved: () => void; reload: () => void }) {
  const lens = useView();
  const [status, setStatus] = useState<ReportStatus>(report.status), [resolution, setResolution] = useState(report.resolution ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const stale = error instanceof ApiError && error.code === "STALE_REVISION";
  return <form className="arena-admin-report-form" onSubmit={async event => {
    event.preventDefault(); if (lens) return; setBusy(true); setError(null);
    try { await api("admin/task-reports/" + encodeURIComponent(report.id), "PATCH", { status, resolution, revision: report.revision }); saved(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }}>
    <h3>Review & resolution</h3><p className="arena-admin-meta">This updates the report. The saved question and its version remain available above.</p>
    <label>Status<Select value={status} onChange={e => setStatus(e.target.value as ReportStatus)} disabled={busy || !!lens}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
    <label>Resolution note<Textarea value={resolution} maxLength={4000} rows={4} onChange={e => setResolution(e.target.value)} disabled={busy || !!lens} placeholder="Record what you checked and the outcome." /></label>
    <p className="arena-admin-meta">{resolution.length.toLocaleString("en-GB")} / 4,000 characters</p>{stale ? <p className="notice error" role="alert">This report changed in another tab. Copy your note, reload the report and review its latest status.</p> : <ErrorNotice error={error} />}
    {!!error && <Button type="button" variant="text" onClick={reload}>Reload current report</Button>}
    <div className="arena-admin-actions"><Button variant="primary" type="submit" disabled={busy || !!lens || status === report.status && resolution === (report.resolution ?? "")}>{busy ? "Saving…" : "Save report"}</Button><span className="arena-admin-meta">Revision {report.revision}</span></div>
  </form>;
}

function ReportDialog({ id, close, saved }: { id: string; close: () => void; saved: () => void }) {
  const r = useResource<ReportDetail>("admin/task-reports/" + encodeURIComponent(id)), panel = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  const [lastSaved, setLastSaved] = useState(false);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; panel.current?.focus();
    function keyboard(event: KeyboardEvent) {
      const dialog = panel.current;
      if (!dialog) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')).filter(item => item.getClientRects().length > 0);
      const first = items[0], last = items.at(-1), active = document.activeElement;
      if (!dialog.contains(active) || active === dialog) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && active === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keyboard, true);
    return () => { document.removeEventListener("keydown", keyboard, true); document.body.style.overflow = overflow; restoreReportFocus(previous); };
  }, []);
  useEffect(() => {
    const dialog = panel.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
  }, [r.data?.revision, r.isLoading]);
  return <div className="arena-admin-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}><section ref={panel} className="arena-admin-report-dialog" role="dialog" aria-modal="true" aria-labelledby="arena-admin-report-title" tabIndex={-1}><header className="arena-admin-dialog-header"><div><p className="arena-admin-meta">Student question report</p><h2 id="arena-admin-report-title">{r.data?.taskTitle ?? "Report details"}</h2></div><Button variant="outline" onClick={close}>Close</Button></header>
    <ErrorNotice error={r.error} />{!r.data ? !r.error && <Loading /> : <>
      <div className="arena-admin-actions"><StatusBadge status={r.data.status} /><span className="arena-admin-badge">{categoryLabels[r.data.category] ?? r.data.category}</span><span className="arena-admin-meta">Version {r.data.versionNumber}</span></div>
      <dl className="arena-admin-report-meta"><div><dt>Reported by</dt><dd>{r.data.reporter.displayName} · {r.data.reporter.username}</dd></div><div><dt>Received</dt><dd><DateLabel value={r.data.createdAt} /></dd></div><div><dt>Task ID</dt><dd><code>{r.data.taskId}</code></dd></div><div><dt>Saved version ID</dt><dd><code>{r.data.taskVersionId}</code></dd></div>{r.data.sourceUid && <div><dt>Source reference</dt><dd>{r.data.sourceUid}</dd></div>}</dl>
      <section className="arena-admin-report-message"><h3>Student message</h3><p>{r.data.message}</p></section>
      <section className="arena-admin-report-context"><h3>Question at the time of the report</h3><p className="arena-admin-meta">Saved version {r.data.versionNumber} · read only</p><MathContent html={r.data.context.statementHtml} />
        {r.data.context.parts.map(part => <div className="arena-admin-report-part" key={part.id}><h4>{part.label} <span className="arena-admin-meta">· {part.maxPoints} marks</span></h4><MathContent html={part.statementHtml} />{part.options.length > 0 && <ol className="arena-admin-report-options" type="A" aria-label={"Options for " + part.label}>{part.options.map(option => <li key={option.id}><MathContent html={option.text} /></li>)}</ol>}</div>)}
        {r.data.context.assets.map(asset => <MaterialAsset key={asset.id} asset={asset} />)}
        {(r.data.context.answerHtml || r.data.context.solutionHtml || r.data.context.parts.some(part => part.options.length > 0)) && <details><summary>Saved answer & solution</summary>{r.data.context.answerHtml && <><h4>Answer</h4><MathContent html={r.data.context.answerHtml} /></>}{r.data.context.parts.filter(part => part.options.length > 0).map(part => <section key={part.id}><h4>{part.label} · saved answer key</h4>{part.options.some(option => option.correct) ? <ol className="arena-admin-report-options" type="A">{part.options.map((option, index) => option.correct ? <li key={option.id} value={index + 1}><MathContent html={option.text} /><span className="arena-admin-badge" data-tone="success">Correct option</span></li> : null)}</ol> : <p className="arena-admin-meta">Answer key not available for this part.</p>}</section>)}{r.data.context.solutionHtml && <><h4>Worked solution</h4><MathContent html={r.data.context.solutionHtml} /></>}</details>}
      </section>
      {r.data.reviewer && <p className="arena-admin-meta">Last reviewed by {r.data.reviewer.displayName}{r.data.reviewedAt && <> · <DateLabel value={r.data.reviewedAt} /></>}</p>}
      {lastSaved && <p className="notice" role="status">Report updated.</p>}
      <ReportEditor key={r.data.id + ":" + r.data.revision} report={r.data} saved={() => { setLastSaved(true); r.refresh(); saved(); window.dispatchEvent(new Event("arena:admin-report-updated")); }} reload={r.refresh} />
    </>}
  </section></div>;
}

export function AdminTaskReports() {
  const [status, setStatus] = useState(""), [query, setQuery] = useState(""), [page, setPage] = useState(1), [selected, setSelected] = useState<string | null>(null);
  const r = useResource<ReportList>(`admin/task-reports?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}&page=${page}&pageSize=25`);
  return <div className="arena-admin-reports"><header className="arena-admin-page-heading"><h1>Question reports</h1><p className="arena-admin-meta">Review student reports against the exact saved question version.</p></header>
    <section className="arena-admin-card"><div className="arena-admin-filter-grid"><label>Search reports<Input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Question, message or student" /></label><label>Status<Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}{r.data ? ` (${r.data.counts[value as ReportStatus]})` : ""}</option>)}</Select></label></div>
      <ErrorNotice error={r.error} />{r.isLoading && <p className="arena-admin-meta" role="status">Loading reports…</p>}
      {r.data && <><p className="arena-admin-meta arena-admin-report-result-count" role="status">{r.data.total.toLocaleString("en-GB")} {r.data.total === 1 ? "report" : "reports"}</p>{r.data.items.length ? <div className="arena-admin-report-list">{r.data.items.map(report => <article key={report.id} className="arena-admin-report-row"><div><div className="arena-admin-actions"><StatusBadge status={report.status} /><span className="arena-admin-meta">{categoryLabels[report.category] ?? report.category} · version {report.versionNumber}</span></div><h2>{report.taskTitle}</h2><p className="arena-admin-report-excerpt">{report.message}</p><p className="arena-admin-meta">{report.reporter.displayName} · <DateLabel value={report.createdAt} /></p></div><Button variant="outline" disabled={r.isLoading} onClick={() => setSelected(report.id)} aria-label={"Open report for " + report.taskTitle}>Open report</Button></article>)}</div> : <p className="arena-admin-empty">{query || status ? "No reports match these filters." : "No student question reports have been received."}</p>}
        <nav className="arena-admin-pagination" aria-label="Report pages"><Button variant="outline" disabled={r.isLoading || page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="arena-admin-meta">Page {r.data.page} of {Math.max(1, r.data.pages)}</span><Button variant="outline" disabled={r.isLoading || page >= r.data.pages} onClick={() => setPage(p => p + 1)}>Next</Button></nav></>}
    </section>{selected && <ReportDialog key={selected} id={selected} close={() => setSelected(null)} saved={r.refresh} />}
  </div>;
}
