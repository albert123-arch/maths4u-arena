"use client";

import { useId, useRef, useState } from "react";
import type { TeacherPreviewQuestion, TeacherPreviewResource, TeacherTaskPreviewDto } from "@/lib/teacher-task-preview-model";
import { Button } from "./controls";
import { ApiError, ErrorNotice, InitialLocale, Loading, MaterialAsset, MathContent, useResource } from "./ui";
import { FullQuestion } from "./full-question";

type Tab = "question" | "answers" | "solution" | "guidance";
const labels: Record<Tab, string> = { question: "Question", answers: "Answers", solution: "Worked solution", guidance: "Marking guidance" };
function Resource({ data, kind }: { data: TeacherPreviewResource; kind: Exclude<Tab, "question"> }) {
  return <div className="teacher-preview-resource">
    {kind === "guidance" && !!data.rows?.length ? <div className="teacher-preview-table-scroll" tabIndex={0} role="region" aria-label="Marking guidance table"><table className="teacher-preview-guidance"><thead><tr><th scope="col">Part</th><th scope="col">Answer / working</th><th scope="col">Mark</th>{data.rows.some(row => row.guidance) && <th scope="col">Guidance</th>}</tr></thead><tbody>{data.rows.map(row => <tr key={row.id}><th scope="row">{row.part ? `(${row.part})` : "—"}</th><td><MathContent html={row.html} /></td><td><strong>{row.code}</strong><span className="teacher-preview-meta"> · {row.marks} {row.marks === 1 ? "mark" : "marks"}</span></td>{data.rows!.some(item => item.guidance) && <td><MathContent html={row.guidance ?? ""} /></td>}</tr>)}</tbody>{data.total !== undefined && <tfoot><tr><th scope="row" colSpan={2}>Total</th><td>{data.total}</td>{data.rows.some(row => row.guidance) && <td />}</tr></tfoot>}</table></div> : data.html ? <MathContent html={data.html} /> : !data.assets.length && <p className="teacher-preview-meta">{kind === "answers" ? "No answer was supplied for this question." : kind === "solution" ? "No worked solution was supplied for this question." : "No marking guidance was supplied for this question."}</p>}
    {data.assets.map(asset => <MaterialAsset key={asset.id} asset={asset} />)}
  </div>;
}

type PreviewProps = { taskId: string; version: TeacherPreviewQuestion; resourcesOnly?: boolean; initial?: TeacherTaskPreviewDto };
function Preview({ taskId, version, resourcesOnly = false, initial }: PreviewProps) {
  const id = useId(), [selected, setSelected] = useState<Tab>(resourcesOnly ? "answers" : "question"), [requested, setRequested] = useState(resourcesOnly), tabs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const keys: Tab[] = resourcesOnly ? ["answers", "solution", "guidance"] : ["question", "answers", "solution", "guidance"];
  const r = useResource<TeacherTaskPreviewDto>(requested && !initial ? `teacher/tasks/${encodeURIComponent(taskId)}/preview?versionId=${encodeURIComponent(version.id)}` : null);
  const data = initial ?? r.data, stale = r.error instanceof ApiError && r.error.status === 409;
  function select(key: Tab) { setSelected(key); if (key !== "question") setRequested(true); }
  return <section className="teacher-task-preview" aria-label="Read-only teacher question preview" lang="en"><div className="teacher-preview-tabs" role="tablist" aria-label="Question preview">{keys.map(key => <Button key={key} type="button" role="tab" id={id + "-tab-" + key} aria-controls={id + "-panel-" + key} aria-selected={selected === key} tabIndex={selected === key ? 0 : -1} ref={node => { tabs.current[key] = node; }} variant="text" onClick={() => select(key)} onKeyDown={event => {
    const index = keys.indexOf(key), next = event.key === "ArrowRight" ? keys[(index + 1) % keys.length] : event.key === "ArrowLeft" ? keys[(index + keys.length - 1) % keys.length] : event.key === "Home" ? keys[0] : event.key === "End" ? keys.at(-1) : undefined;
    if (next) { event.preventDefault(); select(next); tabs.current[next]?.focus(); }
  }}>{labels[key]}</Button>)}</div>
    {!resourcesOnly && <div className="teacher-preview-panel" role="tabpanel" id={id + "-panel-question"} aria-labelledby={id + "-tab-question"} hidden={selected !== "question"} tabIndex={0}><FullQuestion question={version} /></div>}
    {keys.filter((key): key is Exclude<Tab, "question"> => key !== "question").map(key => <div className="teacher-preview-panel" role="tabpanel" id={id + "-panel-" + key} aria-labelledby={id + "-tab-" + key} hidden={selected !== key} tabIndex={0} key={key} aria-busy={selected === key && r.isLoading}>{stale ? <p className="notice error" role="alert">This question version changed. Refresh the question list before opening its resources.</p> : <ErrorNotice error={r.error} />}{r.error ? !stale && <Button type="button" variant="text" onClick={r.refresh}>Retry preview</Button> : !data ? requested && selected === key && <Loading /> : <Resource data={data[key]} kind={key} />}</div>)}
  </section>;
}
export function TeacherTaskPreview(props: PreviewProps) {
  return <InitialLocale locale="en"><Preview key={props.taskId + ":" + props.version.id} {...props} /></InitialLocale>;
}
