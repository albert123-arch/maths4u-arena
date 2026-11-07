"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TeacherAuthoredTaskDetailDto, TeacherAuthoredTaskDto } from "@/lib/teacher-authoring-model";
import { Button, ButtonLink, Input, Select } from "./controls";
import { api, DateLabel, ErrorNotice, Loading, MathContent, useResource } from "./ui";
import { useTaskBasket } from "./task-basket";
import { useView } from "./view-state";

const statuses: Record<TeacherAuthoredTaskDto["status"], string> = { DRAFT: "Private draft", SUBMITTED: "Awaiting review", CHANGES_REQUESTED: "Changes requested", REJECTED: "Not approved", APPROVED: "Approved", WITHDRAWN: "Withdrawn" };
export function AuthoringStatus({ status }: { status: TeacherAuthoredTaskDto["status"] }) {
  return <span className="ae-status" data-status={status}>{statuses[status] ?? status}</span>;
}
function TaskRow({ task }: { task: TeacherAuthoredTaskDto }) {
  const basket = useTaskBasket(), lens = useView();
  const [preview, setPreview] = useState<TeacherAuthoredTaskDetailDto | null>(null), [previewOpen, setPreviewOpen] = useState(false), [previewBusy, setPreviewBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const selected = basket.selection.includes(task.taskId);
  return <article className="ae-task-row">
    <div className="ae-task-row-main"><div className="ae-row"><AuthoringStatus status={task.status} />{task.hasUnsubmittedChanges && <span className="ae-draft-badge">Newer private changes</span>}</div><h2><Link href={"/teacher/tasks/" + task.id}>{task.title}</Link></h2><p className="ae-muted">Private version {task.latestVersionNumber}{task.publicVersionId ? " · An approved version is in the shared bank" : " · Private to your account"}</p><p className="ae-muted ae-small">Updated <DateLabel value={task.updatedAt} /></p>{task.reviewFeedback && <blockquote className="ae-feedback"><strong>Reviewer feedback</strong><p>{task.reviewFeedback}</p></blockquote>}</div>
    <div className="ae-task-row-actions"><ButtonLink variant="primary" href={"/teacher/tasks/" + task.id}>{lens ? "View task" : "Open editor"}</ButtonLink><Button type="button" disabled={basket.busy || !!lens} onClick={() => { void basket.change(ids => selected ? ids.filter(id => id !== task.taskId) : [...ids, task.taskId]).catch(setError); }}>{selected ? "Remove from task set" : "Add to task set"}</Button><Button type="button" variant="text" aria-expanded={previewOpen} disabled={previewBusy} onClick={async () => { if (previewOpen) { setPreviewOpen(false); return; } if (preview) { setPreviewOpen(true); return; } setPreviewBusy(true); setError(null); try { const next = await api<TeacherAuthoredTaskDetailDto>("teacher/authoring/" + task.id); setPreview(next); setPreviewOpen(true); } catch (failure) { setError(failure); } finally { setPreviewBusy(false); } }}>{previewBusy ? "Loading…" : previewOpen ? "Hide saved preview" : "Preview saved task"}</Button></div>
    <ErrorNotice error={error} />
    {previewOpen && preview && <section className="ae-task-saved-preview"><h3>Saved private version {preview.latestVersionNumber}</h3><MathContent html={preview.preview.statement} />{preview.preview.parts.map((part, i) => <div key={part.id}><div className="ae-row"><strong>Part {String.fromCharCode(97 + i)}</strong><span className="ae-muted">{part.maxPoints} marks</span></div><MathContent html={part.prompt} /></div>)}<details><summary>Answer and worked solution</summary>{preview.preview.answer && <MathContent html={preview.preview.answer} />}{preview.preview.solution && <MathContent html={preview.preview.solution} />}</details></section>}
  </article>;
}

export function PersonalTasks() {
  const resource = useResource<{ items: TeacherAuthoredTaskDto[] }>("teacher/authoring"), basket = useTaskBasket(), lens = useView();
  const [query, setQuery] = useState(""), [status, setStatus] = useState("");
  useEffect(() => { const refresh = () => resource.refresh(); window.addEventListener("arena:authoring-updated", refresh); return () => window.removeEventListener("arena:authoring-updated", refresh); }, [resource]);
  const rows = resource.data?.items ?? [], filtered = rows.filter(task => (!status || task.status === status) && task.title.toLocaleLowerCase("en").includes(query.toLocaleLowerCase("en")));
  return <div className="authoring-workspace">
    <header className="ae-page-head"><div><Link className="ae-back" href="/teacher">← Teacher dashboard</Link><h1>My tasks</h1><p className="ae-muted">Your own questions, private drafts and shared-bank reviews.</p></div>{lens ? <Button disabled variant="primary">Create a task</Button> : <ButtonLink variant="primary" href="/teacher/tasks/new">+ Create a task</ButtonLink>}</header>
    {lens && <p className="ae-notice">This viewing mode is read only. Creating, saving and assigning tasks is disabled.</p>}
    <section className="ae-card ae-task-set-strip"><div><h2>Your task set</h2><p className="ae-muted">{basket.data ? `${basket.selection.length} ${basket.selection.length === 1 ? "task" : "tasks"} selected. Add your tasks below, then create homework or a test.` : "Loading your saved task set…"}</p></div>{!lens && basket.selection.length > 0 && <ButtonLink href="/teacher/works/new">Create homework / test →</ButtonLink>}<ButtonLink href="/library">Browse the shared bank</ButtonLink></section>
    <ErrorNotice error={basket.error} /><ErrorNotice error={resource.error} />
    {!resource.data && resource.isLoading ? <Loading /> : resource.data && rows.length === 0 ? <section className="ae-card ae-empty"><div className="ae-empty-symbol" aria-hidden="true">ƒx</div><h2>Your first task starts here</h2><p className="ae-muted">Build a question with visual formula tools. Save it privately, assign it to your classes, and submit a complete version for review when you are ready.</p>{!lens && <ButtonLink href="/teacher/tasks/new" variant="primary">Create your first task</ButtonLink>}</section> : resource.data ? <>
      <section className="ae-list-toolbar" aria-label="Filter your tasks"><label>Find a task<Input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your task titles" /></label><label>Review status<Select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label><p className="ae-muted" role="status">{filtered.length} of {rows.length} {rows.length === 1 ? "task" : "tasks"}</p></section>
      {filtered.length ? <section className="ae-card ae-task-list" aria-label="Your saved tasks">{filtered.map(task => <TaskRow key={task.id + ":" + task.revision} task={task} />)}</section> : <p className="ae-notice">No tasks match your filters. Try another title or review status.</p>}
    </> : null}
  </div>;
}
