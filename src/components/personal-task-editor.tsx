"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TaskInput } from "@/lib/content";
import type { TeacherAuthoredTaskDetailDto } from "@/lib/teacher-authoring-model";
import { Button, ButtonLink, Input, Select, Textarea } from "./controls";
import { ActorContext, api, ApiError, DateLabel, ErrorNotice, Loading, MathContent, useResource } from "./ui";
import { useView } from "./view-state";
import { MathEditor } from "./math-editor";
import { AuthoringStatus } from "./personal-tasks";

type Locale = "en" | "ru";
type CourseOption = { id: string; title: string; topics: { id: string; title: string }[] };
type Snapshot = { material: TaskInput; courseId: string; topicId: string; declaredOriginal: boolean };
type DeviceCopy = Snapshot & { at: string; revision: number | null; serverId: string | null };
const blankText = (locale: Locale): TaskInput["texts"][number] => ({ locale, title: "", statement: "", answer: "", hint: "", solution: "", markScheme: "", markSchemeSource: "", teacherNote: "" });
const blankPart = (locales: Locale[]): TaskInput["parts"][number] => ({ kind: "MANUAL", maxPoints: 1, caseSensitive: false, tolerance: 0, acceptedAnswers: [], options: [], texts: locales.map(locale => ({ locale, prompt: "", answer: "", rubric: "" })) });
function initialMaterial(): TaskInput { return { visibility: "PRIVATE", featureKey: null, difficulty: 1, difficultyKnown: false, materialCategory: "TRAINING", topicIds: [], texts: [blankText("en")], parts: [blankPart(["en"])], assets: [] }; }
const fingerprint = (snapshot: Snapshot) => JSON.stringify(snapshot);
function draftIssues(snapshot: Snapshot) {
  const problems: string[] = [];
  if (!snapshot.declaredOriginal) problems.push("Confirm original authorship before saving.");
  snapshot.material.texts.forEach(text => { if (!text.title.trim()) problems.push(`${text.locale.toUpperCase()}: add a title.`); if (!text.statement.replace(/<[^>]*>/g, "").trim()) problems.push(`${text.locale.toUpperCase()}: add a question.`); });
  snapshot.material.parts.forEach((part, i) => {
    if (!(part.maxPoints > 0 && part.maxPoints <= 100)) problems.push(`Part ${i + 1}: marks must be between 0 and 100.`);
    if (part.kind === "NUMERIC" && !Number.isFinite(part.numericAnswer)) problems.push(`Part ${i + 1}: enter the numeric answer.`);
    if (part.kind === "SHORT" && !part.acceptedAnswers.some(answer => answer.trim())) problems.push(`Part ${i + 1}: add an accepted answer.`);
    if (part.kind === "CHOICE" && (part.options.length < 2 || part.options.filter(option => option.correct).length !== 1 || part.options.some(option => option.texts.some(text => !text.text.trim())))) problems.push(`Part ${i + 1}: add at least two choices and choose one correct answer.`);
  });
  return problems;
}
function completeness(snapshot: Snapshot) {
  const missing = [...draftIssues(snapshot)];
  if (!snapshot.courseId || !snapshot.topicId) missing.push("Choose a course and chapter.");
  snapshot.material.texts.forEach(text => {
    const name = text.locale.toUpperCase();
    if (!text.solution.replace(/<[^>]*>/g, "").trim()) missing.push(`${name}: add a worked solution.`);
    snapshot.material.parts.forEach((part, index) => {
      const local = part.texts.find(t => t.locale === text.locale);
      if (!local?.rubric.replace(/<[^>]*>/g, "").trim()) missing.push(`${name}: add marking guidance for part ${index + 1}.`);
      if (part.kind === "MANUAL" && !local?.answer.replace(/<[^>]*>/g, "").trim() && !text.answer?.replace(/<[^>]*>/g, "").trim()) missing.push(`${name}: add an answer for part ${index + 1}.`);
    });
  });
  return missing;
}

export function PersonalTaskEditor({ id }: { id?: string }) {
  const resource = useResource<TeacherAuthoredTaskDetailDto>(id ? "teacher/authoring/" + id : null), lens = useView();
  if (resource.error) return <ErrorNotice error={resource.error} />;
  if (id && !resource.data) return <Loading />;
  if (lens) return <section className="authoring-workspace ae-readonly"><header><Link href="/teacher/tasks">← My tasks</Link><h1>Personal task preview</h1></header><p className="notice">This viewing mode is read only. Return to your own account to create or edit a private task.</p>{resource.data && <div className="ae-card"><h2>{resource.data.title}</h2><MathContent html={resource.data.preview.statement} />{resource.data.preview.solution && <><h3>Worked solution</h3><MathContent html={resource.data.preview.solution} /></>}</div>}</section>;
  return <PersonalTaskEditorForm key={id ?? "new"} initial={resource.data ?? undefined} />;
}

function PersonalTaskEditorForm({ initial }: { initial?: TeacherAuthoredTaskDetailDto }) {
  const actor = useContext(ActorContext), lens = useView(), router = useRouter();
  const [material, setMaterial] = useState<TaskInput>(() => initial?.material ?? initialMaterial());
  const [record, setRecord] = useState(initial ?? null), recordRef = useRef(initial ?? null);
  const [courseId, setCourseId] = useState(initial?.courseId ?? ""), [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [declaredOriginal, setDeclaredOriginal] = useState(!!initial), [permission, setPermission] = useState(false), [reviewNote, setReviewNote] = useState("");
  const [locale, setLocale] = useState<Locale>(initial?.material.texts.some(t => t.locale === "en") !== false ? "en" : "ru");
  const [busy, setBusy] = useState(false), busyRef = useRef(false), [error, setError] = useState<unknown>(null), [paused, setPaused] = useState(false);
  const [savedAt, setSavedAt] = useState(initial?.updatedAt ?? ""), [message, setMessage] = useState("");
  const [autosave, setAutosave] = useState(true), [deviceCopy, setDeviceCopy] = useState<DeviceCopy | null>(null), [deviceLoaded, setDeviceLoaded] = useState(false), [deviceFailed, setDeviceFailed] = useState(false);
  const snapshot: Snapshot = { material, courseId, topicId, declaredOriginal }, hash = fingerprint(snapshot);
  const [savedHash, setSavedHash] = useState(() => fingerprint({ material: initial?.material ?? material, courseId: initial?.courseId ?? "", topicId: initial?.topicId ?? "", declaredOriginal: !!initial }));
  const currentHash = useRef(hash);
  useEffect(() => { currentHash.current = hash; }, [hash]);
  const dirty = hash !== savedHash, issues = draftIssues(snapshot), missing = completeness(snapshot), courses = useResource<CourseOption[]>("courses");
  const cacheKey = `arena:personal-task:${actor?.id ?? "guest"}:${initial?.id ?? "new"}`;
  useEffect(() => {
    if (lens) return;
    const timer = window.setTimeout(() => { try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const copy = JSON.parse(raw) as DeviceCopy;
        if (copy.material?.texts?.length && copy.material?.parts?.length) {
          const saved = fingerprint({ material: copy.material, courseId: copy.courseId, topicId: copy.topicId, declaredOriginal: copy.declaredOriginal });
          if (saved !== savedHash) setDeviceCopy(copy);
        }
      }
    } catch { setDeviceFailed(true); }
    setDeviceLoaded(true); }, 0);
    return () => window.clearTimeout(timer);
    // Read the device copy once; a new save must never replace the editor state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, lens]);
  useEffect(() => {
    if (lens || !deviceLoaded || deviceCopy || !dirty) return;
    // Write the latest local snapshot immediately so a quick route change cannot
    // cancel a delayed device save. This is never evidence of a server save.
    try { localStorage.setItem(cacheKey, JSON.stringify({ ...snapshot, at: new Date().toISOString(), revision: recordRef.current?.revision ?? null, serverId: recordRef.current?.id ?? null })); } catch { queueMicrotask(() => setDeviceFailed(true)); }
    // hash represents the complete immutable snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, dirty, cacheKey, deviceLoaded, deviceCopy, lens, record?.revision]);
  useEffect(() => {
    if (!dirty || lens) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, lens]);
  const update = (fn: (next: TaskInput) => void) => { setMaterial(old => { const next = structuredClone(old); fn(next); return next; }); setMessage(""); };

  const save = useCallback(async (automatic = false) => {
    if (lens || busyRef.current) return null;
    if (draftIssues(snapshot).length) { if (!automatic) setMessage("Add a title, question and valid answer settings, and confirm authorship to save this draft."); return null; }
    const captured = structuredClone(snapshot), capturedHash = fingerprint(captured), previous = recordRef.current;
    if (previous && capturedHash === savedHash) { setMessage("Your private draft is already up to date."); return previous; }
    busyRef.current = true; setBusy(true); setError(null); setMessage("");
    try {
      const next = await api<TeacherAuthoredTaskDetailDto>("teacher/authoring" + (previous ? "/" + previous.id : ""), previous ? "PUT" : "POST", { ...captured, courseId: captured.courseId || null, topicId: captured.topicId || null, ...(previous ? { revision: previous.revision } : {}) });
      recordRef.current = next; setRecord(next); setSavedHash(capturedHash); setSavedAt(next.updatedAt); setPaused(false);
      setMessage(automatic ? "" : "Saved privately. You can assign this task to your own classes.");
      if (currentHash.current === capturedHash) { try { localStorage.removeItem(cacheKey); } catch { /* Saving on the server still succeeded. */ } }
      window.dispatchEvent(new Event("arena:authoring-updated"));
      return next;
    } catch (failure) { setError(failure); setPaused(true); return null; }
    finally { busyRef.current = false; setBusy(false); }
  // Snapshot hash changes only when an editable field changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, savedHash, cacheKey, lens]);
  useEffect(() => {
    if (lens || !record || !autosave || !dirty || busy || paused || issues.length) return;
    const timer = window.setTimeout(() => { void save(true); }, 1800);
    return () => window.clearTimeout(timer);
  }, [lens, record, autosave, dirty, busy, paused, hash, issues.length, save]);
  const local = material.texts.find(t => t.locale === locale)!, textIndex = material.texts.findIndex(t => t.locale === locale);
  const selectedCourse = courses.data?.find(course => course.id === courseId);
  const conflict = error instanceof ApiError && ["STALE_AUTHORING", "STALE_REVISION", "AUTHORING_CONFLICT", "STALE_SUBMISSION"].includes(error.code);
  const activeSubmission = record?.submissions.find(submission => submission.status === "SUBMITTED");
  function downloadDraft() {
    const blob = new Blob([JSON.stringify({ ...snapshot, revision: recordRef.current?.revision, savedAt }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = url; anchor.download = "maths4u-private-task.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  function restoreDeviceCopy() {
    if (!deviceCopy || lens) return;
    if (deviceCopy.serverId && !record) {
      // A refresh of /new must resume its existing identity, never create a
      // duplicate task from a device copy that was saved while creation ran.
      try { localStorage.setItem(`arena:personal-task:${actor?.id ?? "guest"}:${deviceCopy.serverId}`, JSON.stringify(deviceCopy)); localStorage.removeItem(cacheKey); }
      catch { setDeviceFailed(true); return; }
      router.push("/teacher/tasks/" + deviceCopy.serverId);
      return;
    }
    setMaterial(deviceCopy.material); setCourseId(deviceCopy.courseId); setTopicId(deviceCopy.topicId); setDeclaredOriginal(deviceCopy.declaredOriginal);
    if (record && deviceCopy.revision !== null && deviceCopy.revision !== record.revision) {
      recordRef.current = { ...record, revision: deviceCopy.revision };
      setPaused(true); setError(new ApiError("STALE_REVISION", 409));
    }
    setDeviceCopy(null);
  }
  async function loadLatestRevision() {
    if (!recordRef.current || busyRef.current || lens) return;
    busyRef.current = true; setBusy(true);
    try {
      const latest = await api<TeacherAuthoredTaskDetailDto>("teacher/authoring/" + recordRef.current.id);
      recordRef.current = latest; setRecord(latest); setError(null); setPaused(true);
      setMessage("The latest saved revision is loaded for your next save. Your typed text is unchanged. Check the saved version, then choose Save private to create a new version with your text.");
    } catch (failure) { setError(failure); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function submitReview() {
    if (lens || busyRef.current || missing.length || !permission) return;
    const capturedHash = hash, latest = dirty ? await save() : recordRef.current;
    if (!latest || currentHash.current !== capturedHash) { setMessage("Your draft changed while it was saving. Check the latest text, then submit again."); return; }
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const next = await api<TeacherAuthoredTaskDetailDto>(`teacher/authoring/${latest.id}/submit`, "POST", { revision: latest.revision, taskVersionId: latest.latestVersionId, courseId, topicId, declaredOriginal: true, permissionToPublish: true, note: reviewNote });
      recordRef.current = next; setRecord(next); setMessage(`Version ${latest.latestVersionNumber} submitted for review. It stays private until an administrator approves it.`); setPermission(false);
      window.dispatchEvent(new Event("arena:authoring-updated"));
    } catch (failure) { setError(failure); setPaused(true); } finally { busyRef.current = false; setBusy(false); }
  }
  return <div className="authoring-workspace">
    <header className="ae-page-head"><div><Link className="ae-back" href="/teacher/tasks">← My tasks</Link><h1>{initial ? "Edit your task" : "Create a task"}</h1><p className="ae-muted">Write a question, build formulas visually, and keep your work private.</p></div><ButtonLink href="/teacher/tasks">My tasks</ButtonLink></header>
    <div className="ae-save-strip"><span className="ae-save-state" role="status" data-state={paused ? "error" : dirty ? "pending" : "saved"}>{busy ? "Saving…" : paused ? "Saving paused — your text is retained" : !record ? "New private draft" : dirty ? "Unsaved changes" : "Saved privately"}{savedAt && !dirty && !busy ? <> · <DateLabel value={savedAt} /></> : null}</span>{record && <span className="ae-muted">Private version {record.latestVersionNumber}</span>}<label className="ae-check"><Input type="checkbox" checked={autosave} onChange={event => setAutosave(event.target.checked)} />Autosave after first save</label></div>
    {deviceCopy && <section className="ae-notice" role="status"><strong>A device copy is available</strong><p>Saved on this device on <DateLabel value={deviceCopy.at} />. Restore it to recover your typed work. The server draft stays unchanged until you save.</p><div className="ae-row"><Button type="button" onClick={restoreDeviceCopy}>{deviceCopy.serverId && !record ? "Continue saved task with device copy" : "Restore device copy"}</Button>{deviceCopy.serverId && <ButtonLink href={"/teacher/tasks/" + deviceCopy.serverId}>Open saved task</ButtonLink>}<Button type="button" variant="text" onClick={() => { try { localStorage.removeItem(cacheKey); } catch { /* Optional device storage. */ } setDeviceCopy(null); }}>Dismiss device copy</Button></div></section>}
    {deviceFailed && <p className="ae-notice">A device copy could not be saved in this browser. Keep this page open until the server reports Saved privately, or download your draft.</p>}
    {(conflict || paused) && <section className="ae-notice ae-notice-warning" role="alert"><strong>{conflict ? "This task changed in another tab" : "Autosave is paused"}</strong><p>Your typed work is still here. Download a copy before opening the saved version. Autosave will stay paused until a successful manual save.</p><div className="ae-row"><Button type="button" onClick={downloadDraft}>Download my draft</Button>{record && <ButtonLink href={"/teacher/tasks/" + record.id} target="_blank">Open saved version ↗</ButtonLink>}{conflict && <Button type="button" disabled={busy} onClick={() => { void loadLatestRevision(); }}>Keep my text and load latest revision</Button>}</div></section>}
    <ErrorNotice error={error} />{message && <p className="ae-notice" role="status">{message}</p>}
    <div className="ae-editor-layout"><main className="ae-edit-content"><nav className="ae-section-nav" aria-label="Editor sections"><a href="#task-question">1. Question</a><a href="#task-parts">2. Parts & marks</a><a href="#task-solution">3. Solution</a><a href="#task-review">4. Review</a></nav>
      <section className="ae-card" id="task-question"><div className="ae-section-head"><h2>1. Write your question</h2><div className="ae-locale-tabs" aria-label="Question language">{material.texts.map(text => <Button key={text.locale} type="button" aria-pressed={locale === text.locale} onClick={() => setLocale(text.locale)}>{text.locale === "en" ? "English" : "Русский"}</Button>)}{material.texts.length === 1 && <Button type="button" variant="text" onClick={() => { const nextLocale = locale === "en" ? "ru" : "en"; update(next => { next.texts.push(blankText(nextLocale)); next.parts.forEach(part => { part.texts.push({ locale: nextLocale, prompt: "", answer: "", rubric: "" }); part.options.forEach(option => option.texts.push({ locale: nextLocale, text: "" })); }); }); setLocale(nextLocale); }}>+ {locale === "en" ? "Russian" : "English"}</Button>}</div></div>
        <label>Task title<Input value={local.title} maxLength={191} placeholder="For example: Finding the area under a curve" onChange={event => update(next => { next.texts[textIndex].title = event.target.value; })} /></label>
        <MathEditor label="Question" value={local.statement} required rows={7} description="Use blank lines for paragraphs. Select text to make it bold, or add a list. Formula buttons handle the mathematical notation for you." onChange={value => update(next => { next.texts[textIndex].statement = value; })} />
        <div className="ae-field-grid"><label>Task type<Select value={material.materialCategory} onChange={event => update(next => { next.materialCategory = event.target.value as TaskInput["materialCategory"]; })}><option value="TRAINING">Practice</option><option value="EXAM">Original exam-style</option><option value="OLYMPIAD">Olympiad</option></Select></label><label>Difficulty<Select value={material.difficultyKnown ? material.difficulty : ""} onChange={event => update(next => { next.difficultyKnown = !!event.target.value; next.difficulty = Number(event.target.value) || 1; })}><option value="">Not set</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} — {["Foundation", "Developing", "Standard", "Challenging", "Extension"][value - 1]}</option>)}</Select></label></div>
      </section>
      <section className="ae-card" id="task-parts"><div className="ae-section-head"><div><h2>2. Parts, answers & marks</h2><p className="ae-muted">{material.parts.reduce((sum, part) => sum + part.maxPoints, 0)} marks in total · Manual answers are marked by a teacher.</p></div></div>
        {material.parts.map((part, pi) => { const pt = part.texts.find(t => t.locale === locale)!, pti = part.texts.findIndex(t => t.locale === locale); return <section className="ae-part" key={pi}><div className="ae-section-head"><h3>Part {String.fromCharCode(97 + pi)}</h3>{material.parts.length > 1 && <Button type="button" variant="text" onClick={() => update(next => { next.parts.splice(pi, 1); })}>Remove part {String.fromCharCode(97 + pi)}</Button>}</div><div className="ae-field-grid"><label>Answer checking<Select value={part.kind} onChange={event => update(next => { const row = next.parts[pi]; row.kind = event.target.value as typeof row.kind; if (row.kind === "CHOICE" && row.options.length < 2) row.options = [true, false].map(correct => ({ correct, texts: next.texts.map(t => ({ locale: t.locale, text: "" })) })); })}><option value="MANUAL">Teacher marks written work</option><option value="NUMERIC">Check a number automatically</option><option value="CHOICE">Multiple choice</option><option value="SHORT">Check a short text answer</option></Select></label><label>Marks<Input type="number" min="0.5" max="100" step="0.5" value={part.maxPoints} onChange={event => update(next => { next.parts[pi].maxPoints = Number(event.target.value); })} /></label></div>
          <MathEditor label={`Part ${String.fromCharCode(97 + pi)} prompt (optional)`} value={pt.prompt} rows={3} onChange={value => update(next => { next.parts[pi].texts[pti].prompt = value; })} />
          {part.kind === "NUMERIC" && <div className="ae-field-grid"><label>Correct number<Input type="number" step="any" value={part.numericAnswer ?? ""} onChange={event => update(next => { next.parts[pi].numericAnswer = event.target.value === "" ? undefined : Number(event.target.value); })} /></label><label>Allowed difference (tolerance)<Input type="number" min="0" step="any" value={part.tolerance} onChange={event => update(next => { next.parts[pi].tolerance = Number(event.target.value); })} /></label></div>}
          {part.kind === "SHORT" && <><label>Accepted answers (one per line)<Textarea value={part.acceptedAnswers.join("\n")} onChange={event => update(next => { next.parts[pi].acceptedAnswers = event.target.value.split("\n").filter(Boolean); })} /></label><label className="ae-check"><Input type="checkbox" checked={part.caseSensitive} onChange={event => update(next => { next.parts[pi].caseSensitive = event.target.checked; })} />Capital letters must match</label></>}
          {part.kind === "CHOICE" && <div className="ae-options"><p className="ae-muted">Select the one correct choice.</p>{part.options.map((option, oi) => { const oti = option.texts.findIndex(t => t.locale === locale); return <div className="ae-option" key={oi}><label className="ae-check"><Input type="radio" name={`correct-${pi}`} checked={option.correct} onChange={() => update(next => { next.parts[pi].options.forEach((row, i) => { row.correct = i === oi; }); })} />Correct</label><MathEditor label={`Choice ${String.fromCharCode(65 + oi)}`} rows={2} value={option.texts[oti]?.text ?? ""} onChange={value => update(next => { next.parts[pi].options[oi].texts[oti].text = value; })} />{part.options.length > 2 && <Button type="button" variant="text" onClick={() => update(next => { next.parts[pi].options.splice(oi, 1); })}>Remove choice {String.fromCharCode(65 + oi)}</Button>}</div>; })}<Button type="button" disabled={part.options.length >= 20} onClick={() => update(next => { next.parts[pi].options.push({ correct: false, texts: next.texts.map(t => ({ locale: t.locale, text: "" })) }); })}>+ Add choice</Button></div>}
          <MathEditor label={part.kind === "MANUAL" ? "Expected answer" : "Answer shown to learners (optional)"} value={pt.answer} rows={3} onChange={value => update(next => { next.parts[pi].texts[pti].answer = value; })} />
          <MathEditor label="Marking guidance" value={pt.rubric} rows={4} description="Describe how the marks are earned, including method and accuracy marks where helpful. These are your indicative criteria." onChange={value => update(next => { next.parts[pi].texts[pti].rubric = value; })} />
        </section>; })}
        <Button type="button" disabled={material.parts.length >= 30} onClick={() => update(next => { next.parts.push(blankPart(next.texts.map(t => t.locale))); })}>+ Add part</Button>
      </section>
      <section className="ae-card" id="task-solution"><h2>3. Explain the solution</h2><MathEditor label="Worked solution" required value={local.solution} rows={7} description="Show the reasoning and each important step. This is required for shared-bank review, and can be completed later in a private draft." onChange={value => update(next => { next.texts[textIndex].solution = value; })} /><details className="ae-advanced"><summary>Optional hint and whole-task answer</summary><MathEditor label="Hint" value={local.hint} rows={3} onChange={value => update(next => { next.texts[textIndex].hint = value; })} /><MathEditor label="Whole-task answer" value={local.answer ?? ""} rows={3} onChange={value => update(next => { next.texts[textIndex].answer = value; })} /></details></section>
    </main><aside className="ae-workflow"><section className="ae-card"><span className="ae-mini-label">Your workspace</span><h2>Keep it private</h2><p className="ae-muted">Your saved task is available to you and can be assigned to your classes. Saving does not publish it in the shared bank.</p><label className="ae-check ae-declaration"><Input type="checkbox" checked={declaredOriginal} onChange={event => setDeclaredOriginal(event.target.checked)} />I independently authored this task and its solution. It is not copied or lightly paraphrased from an examination question.</label><Button type="button" variant="primary" disabled={busy || !!lens || issues.length > 0} onClick={() => { void save(); }}>{busy ? "Saving…" : "Save private"}</Button>{!record && <p className="ae-muted ae-small">After your first save, valid changes save automatically. Incomplete work stays in a device copy.</p>}{issues.length > 0 && <ul className="ae-checklist">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}{record && <ButtonLink href="/teacher/tasks">Choose this task for an assignment →</ButtonLink>}<Button type="button" variant="text" onClick={downloadDraft}>Download draft copy</Button></section>
      <section className="ae-card" id="task-review"><span className="ae-mini-label">Shared problem bank</span><h2>4. Submit for review</h2>{record && <AuthoringStatus status={record.status} />}{record?.reviewFeedback && <blockquote className="ae-feedback"><strong>Reviewer feedback</strong><p>{record.reviewFeedback}</p></blockquote>}<p className="ae-muted">An administrator reviews the exact saved version you submit. A later private edit stays private and needs its own review.</p><label>Course<Select value={courseId} onChange={event => { setCourseId(event.target.value); setTopicId(""); }}><option value="">Choose course</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</Select></label><label>Chapter<Select value={topicId} disabled={!selectedCourse} onChange={event => setTopicId(event.target.value)}><option value="">Choose chapter</option>{selectedCourse?.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</Select></label><ErrorNotice error={courses.error} /><label>Note to reviewer (optional)<Textarea value={reviewNote} maxLength={4000} rows={3} onChange={event => setReviewNote(event.target.value)} /></label><label className="ae-check ae-declaration"><Input type="checkbox" checked={permission} onChange={event => setPermission(event.target.checked)} />I give Maths4U permission to publish the submitted task, solution and marking guidance in the shared bank after approval.</label>
        {missing.length > 0 && <details className="ae-advanced"><summary>{missing.length} {missing.length === 1 ? "item" : "items"} to complete before review</summary><ul className="ae-checklist">{missing.map(item => <li key={item}>{item}</li>)}</ul></details>}
        <Button type="button" variant="primary" disabled={busy || !!lens || missing.length > 0 || !permission || !!activeSubmission} onClick={() => { void submitReview(); }}>{activeSubmission ? "Version awaiting review" : "Submit for review"}</Button>
        {activeSubmission && <><p className="ae-muted ae-small">Version {activeSubmission.versionNumber} is awaiting review. Your newer edits are not part of that submission.</p><Button type="button" disabled={busy} onClick={async () => { if (!recordRef.current || busyRef.current || lens) return; busyRef.current = true; setBusy(true); setError(null); try { const next = await api<TeacherAuthoredTaskDetailDto>(`teacher/authoring/${recordRef.current.id}/withdraw`, "POST", { revision: recordRef.current.revision, submissionId: activeSubmission.id, submissionRevision: activeSubmission.revision }); recordRef.current = next; setRecord(next); setMessage("Submission withdrawn. Your task remains private."); } catch (failure) { setError(failure); setPaused(true); } finally { busyRef.current = false; setBusy(false); } }}>Withdraw submission</Button></>}
      </section>
      {!!record?.submissions.length && <section className="ae-card"><h2>Version history</h2><ol className="ae-history">{record.submissions.map(submission => <li key={submission.id}><strong>Version {submission.versionNumber}</strong><AuthoringStatus status={submission.status} /><DateLabel value={submission.submittedAt} />{submission.feedback && <p>{submission.feedback}</p>}</li>)}</ol></section>}
    </aside></div>
  </div>;
}
