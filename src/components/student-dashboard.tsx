"use client";

import Link from "next/link";
import { useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { StudentDashboardDto } from "@/lib/dashboards";
import type { DashboardSegments } from "@/lib/student-dashboard-model";
import type { courseChoices } from "@/lib/learning-home";
import { ActorContext, api, ErrorNotice, Loading, useResource } from "./ui";
import { Button, ButtonLink, Input } from "./controls";
import { useView } from "./view-state";
import { useReviewNow } from "./square-progress";
import { Pure1Review } from "./pure1-review";

type IconName = "assignments" | "review" | "feedback" | "focus" | "flag" | "book" | "bookmark" | "clock" | "lock";
export function DashboardIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    assignments: <><rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
    review: <><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5M20 7l-3-3"/></>,
    feedback: <path d="M4 4h16v12H9l-5 4V4Z"/>,
    focus: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    flag: <><path d="M5 22V3h13l-3 4 3 4H5"/></>,
    book: <><path d="M5 3h15v18H5a2 2 0 0 1 0-4h15M5 3a2 2 0 0 0-2 2v14"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  };
  return <svg className="sd-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Meter({ value, total, label, success = false }: { value: number; total: number; label: string; success?: boolean }) {
  const safe = Math.min(Math.max(value, 0), Math.max(total, 0));
  return <div className="sd-meter" data-tone={success ? "success" : undefined} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(total, 1)} aria-valuenow={safe} aria-valuetext={`${safe} of ${total}`}><span style={{ width: `${total ? safe / total * 100 : 0}%` }}/></div>;
}
function Segments({ value, label }: { value: DashboardSegments; label: string }) {
  return <div className="sd-segments" role="img" aria-label={`${label}: ${value.solved} solved independently, ${value.tried} tried or with help, ${value.due} due for review, ${value.untouched} not tried`} title="Recorded practice by question family. Reading notes and self-awarded marks do not establish independent mastery.">
    {(["solved", "tried", "due", "untouched"] as const).map(key => <span key={key} data-segment={key} style={{ width: `${value.total ? value[key] / value.total * 100 : 0}%` }}/>)}</div>;
}
function Legend({ mobile = false }: { mobile?: boolean }) {
  return <ul className={`sd-legend ${mobile ? "sd-mobile-only" : "sd-desktop-only"}`} aria-label="Progress legend">{[
    ["solved", mobile ? "Solved" : "Solved independently"], ["tried", mobile ? "Tried" : "Tried or with help"], ["due", mobile ? "Review" : "Due for review"], ["untouched", "Not tried yet"],
  ].map(([state, text]) => <li key={state}><span className="sd-legend-dot" data-segment={state}/>{text}</li>)}</ul>;
}
function CardHeading({ icon, title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return <div className="sd-card-heading"><h2>{icon && <DashboardIcon name={icon}/>} {title}</h2>{children}</div>;
}
function PlusBadge() { return <span className="sd-lock-badge"><DashboardIcon name="lock"/>Plus</span>; }
function LockedAnalytics({ text }: { text: string }) {
  return <div className="sd-locked-state"><DashboardIcon name="lock"/><h3>See your next step more clearly</h3><p>{text}</p><ButtonLink href="/access">View Plus access</ButtonLink></div>;
}
function dateLabel(at: number, zone: string, options: Intl.DateTimeFormatOptions) { return new Intl.DateTimeFormat("en-GB", { timeZone: zone, ...options }).format(at); }
function dueLabel(at: number, now: number, zone: string) {
  const key = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(n);
  const day = key(at) === key(now) ? "Today" : key(at) === key(now + 86400000) ? "Tomorrow" : dateLabel(at, zone, { day: "numeric", month: "short" });
  return `${day}, ${dateLabel(at, zone, { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function subscribeExamDate(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener("arena-exam-date", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("arena-exam-date", callback); };
}
function ExamDate({ userId, readOnly }: { userId: string; readOnly: boolean }) {
  const key = "arena.next-exam-date.v1." + userId;
  const saved = useSyncExternalStore(subscribeExamDate, () => { try { const value = readOnly ? "" : localStorage.getItem(key) ?? ""; return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T12:00:00Z")) ? value : ""; } catch { return ""; } }, () => "");
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(""), [error, setError] = useState(false);
  return <div className="sd-exam-date"><Button disabled={readOnly} onClick={() => { setDraft(saved); setOpen(!open); }}>{saved ? dateLabel(Date.parse(saved + "T12:00:00Z"), "UTC", { day: "numeric", month: "short", year: "numeric" }) : "Set exam date"}</Button>{open && <form className="sd-exam-date-form" onSubmit={e => { e.preventDefault(); if (readOnly) return; try { if (draft) localStorage.setItem(key, draft); else localStorage.removeItem(key); window.dispatchEvent(new Event("arena-exam-date")); setError(false); setOpen(false); } catch { setError(true); } }}><label>Next exam date<Input type="date" value={draft} onChange={e => setDraft(e.target.value)}/></label><p className="sd-muted">Your planning date, saved on this device.</p><div className="sd-actions"><Button variant="primary" type="submit">Save date</Button><Button type="button" onClick={() => setOpen(false)}>Cancel</Button></div>{error && <p role="alert">This browser could not save the date. Your progress has not changed.</p>}</form>}</div>;
}

export function StudentDashboard() {
  const actor = useContext(ActorContext), lens = useView(), clock = useReviewNow();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const r = useResource<StudentDashboardDto>(actor ? "dashboard/student?timeZone=" + encodeURIComponent(zone) : null);
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [earlierOpen, setEarlierOpen] = useState(false);
  const choices = useResource<Awaited<ReturnType<typeof courseChoices>>>(actor && (editing || r.data?.selectedCourses.length === 0) ? "learning/course-choices" : null);
  const refresh = r.refresh;
  useEffect(() => { function focus() { refresh(); } window.addEventListener("focus", focus); return () => window.removeEventListener("focus", focus); }, [refresh]);
  if (r.error) return <ErrorNotice error={r.error}/>;
  if (!r.data || !actor) return <Loading/>;
  const d = r.data, current = d.currentLesson, timeZone = d.activity.timeZone;
  const remainingWritten = current ? Math.max(0, current.writtenTotal - current.writtenWorked) : 0;
  const hour = Number(dateLabel(clock, timeZone, { hour: "2-digit", hourCycle: "h23" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = d.student.displayName.trim().split(/\s+/)[0] || "there";
  const reviews = d.reviewQuestions, reviewHref = reviews[0]?.href, reviewMinutes = Math.max(1, Math.ceil(Math.min(reviews.length, 12) * .8));
  const pending = d.assignmentCards.find(w => ["NOT_STARTED", "IN_PROGRESS", "OVERDUE"].includes(w.status) && w.opensAt <= clock);
  const studyMinutes = current ? Math.max(3, Math.min(15, (current.quickTotal - current.quickChecked) * 2 || 5)) : 0;
  const plan = [
    ...(pending ? [{ title: pending.title, href: pending.href, detail: `Assignment · ${dueLabel(pending.dueAt, clock, timeZone)}`, minutes: Math.max(5, Math.min(40, (pending.questionsTotal - pending.questionsDone) * 2)) }] : []),
    ...(reviewHref ? [{ title: `Review ${reviews.length} ${reviews.length === 1 ? "question" : "questions"}`, href: reviewHref, detail: "Spaced review", minutes: reviewMinutes }] : []),
    ...(current ? [{ title: `${current.last > 0 ? "Continue" : "Start"} ${current.title}`, href: current.nextStepHref, detail: current.quickChecked < current.quickTotal ? `${current.quickTotal - current.quickChecked} quick-check ${current.quickTotal - current.quickChecked === 1 ? "family" : "families"} to try` : "Notes, examples and written practice", minutes: studyMinutes }] : []),
  ].slice(0, 3);
  const featured = d.courses.find(c => c.id === current?.courseId) ?? d.courses[0], others = d.courses.filter(c => c.id !== featured?.id).sort((a, b) => b.practisedLessons - a.practisedLessons || a.position - b.position);
  const reviewTags = [...new Set(reviews.map(q => q.lessonTitle))].slice(0, 3);
  const unready = d.selectedCourses.filter(c => !d.courses.some(available => available.id === c.id));
  async function toggleCourse(id: string, selected: boolean) { setBusy(true); setError(null); try { await api("learning/courses/" + id, "POST", { selected }); r.refresh(); } catch (e) { setError(e); } finally { setBusy(false); } }
  function courseCard(c: StudentDashboardDto["courses"][number], expanded = false) {
    return <article className="sd-card sd-course-card" key={c.id} data-course={c.slug}><header className="sd-course-header"><span className="sd-course-accent"/><div><h3><Link href={c.href}>{c.title}</Link></h3><p className="sd-muted sd-desktop-only">{c.code && `${c.code} · `}{c.chapters.length} {c.chapters.length === 1 ? "chapter" : "chapters"}</p></div><Link className="sd-link sd-desktop-only" href={c.href}>Course map</Link><span className="sd-course-count">{c.status === "NOT_STARTED" ? "Not started" : `${c.chapters.length} {c.chapters.length === 1 ? "chapter" : "chapters"}`}</span></header>
      <Segments value={c.segments} label={c.title}/>
      {expanded ? <div className="sd-chapter-list">{c.chapters.map(ch => {
        const here = c.id === current?.courseId && ch.title === current.chapterTitle;
        const status = here ? "You are here" : ch.status === "SOLVED" ? "Secure" : ch.status === "DUE" ? "Review due" : ch.status === "IN_PROGRESS" ? "In progress" : "Not tried yet";
        return <div className="sd-chapter-row" key={ch.id}><Link className="sd-chapter-title" href={ch.href}>{ch.title}</Link><Segments value={ch.segments} label={ch.title}/><span className="sd-chapter-status" data-state={here ? "current" : ch.status === "SOLVED" ? "secure" : ch.status === "DUE" ? "due" : undefined}>{status}</span></div>;
      })}</div> : <div className="sd-course-next sd-desktop-only"><span className="sd-muted">{c.status === "NOT_STARTED" ? "Not started — begin with" : "Next lesson"}</span><br/><Link href={c.resume?.href ?? c.nextLesson.href}>{c.resume?.title ?? c.nextLesson.title} →</Link></div>}
    </article>;
  }
  return <div className="student-dashboard" lang="en">
    <header className="sd-greeting"><div className="sd-greeting-copy"><p className="sd-date">{dateLabel(clock, timeZone, { weekday: "long", day: "numeric", month: "long" })}</p><h1>{greeting}, {firstName}</h1></div><div className="sd-week" title={`Recorded study actions this week, ${timeZone}. A missed day does not reset your progress.`}><span className="sd-week-label">This week</span><span className="sd-week-dots" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span key={i} data-active={i < d.activity.activeDays}/>)}</span><strong>{Math.min(d.activity.activeDays, 5)} of 5 study days</strong></div></header>

    <div className="sd-top-grid">
      <section className="sd-card sd-continue" aria-label="Continue learning">{current ? <><span className="sd-course-pill">{current.courseTitle} · {current.chapterTitle}</span><p className="sd-continue-kicker">{current.last > 0 ? "Pick up where you left off" : "Your next learning step"}</p><h2 className="sd-continue-title">{current.title}</h2><p className="sd-continue-summary">{current.quickChecked ? `You have tried ${current.quickChecked} of ${current.quickTotal} quick-check families.` : "Start with the notes and examples, then try a quick check."} {current.writtenTotal > 0 && `${remainingWritten} written ${remainingWritten === 1 ? "question is" : "questions are"} ready when you are.`}</p><div className="sd-lesson-progress"><div className="sd-progress-row" data-kind="notes"><span className="sd-progress-label">Notes &amp; examples</span><span className="sd-read-state" data-read={current.notesRead}>{current.notesRead ? "✓ Read" : "Ready to read"}</span></div><div className="sd-progress-row"><span className="sd-progress-label">Skills checked</span><Meter value={current.quickChecked} total={current.quickTotal} label="Quick-check families tried"/><span className="sd-progress-value">{current.quickChecked} / {current.quickTotal}</span></div><div className="sd-progress-row"><span className="sd-progress-label">Written practice</span><Meter value={current.writtenWorked} total={current.writtenTotal} label="Written questions worked"/><span className="sd-progress-value">{current.writtenWorked} / {current.writtenTotal}</span></div></div><div className="sd-actions"><ButtonLink variant="primary" href={current.nextStepHref}>{current.last > 0 ? "Continue lesson" : "Start lesson"}<span className="sd-desktop-only" aria-hidden="true">→</span></ButtonLink><ButtonLink className="sd-desktop-only" href={current.href + "#notes"}>Open notes</ButtonLink></div></> : <><span className="sd-course-pill">Your learning starts here</span><h2 className="sd-continue-title">{d.selectedCourses.length ? "Your courses are saved" : "Choose your first course"}</h2><p className="sd-continue-summary">{d.selectedCourses.length ? "Your selections stay here while access or course materials are being prepared." : "Keep your lessons, practice and next steps together in one place."}</p><div className="sd-actions"><Button variant="primary" disabled={!!lens} onClick={() => setEditing(true)}>{d.selectedCourses.length ? "Manage courses" : "Choose courses"}</Button><ButtonLink href="/courses">Explore courses</ButtonLink></div></>}</section>
      <section className="sd-card sd-plan"><CardHeading title="Today's plan">{!!plan.length && <span className="sd-plan-time" title="Approximate planning time, not a timer"><DashboardIcon name="clock"/>≈ {plan.reduce((n, item) => n + item.minutes, 0)} min</span>}</CardHeading>{plan.length ? <ol className="sd-plan-list">{plan.map((item, i) => <li key={item.href + i}><span className="sd-plan-number">{i + 1}</span><div><Link href={item.href}>{item.title}</Link><span className="sd-muted">{item.detail} · ≈ {item.minutes} min</span></div></li>)}</ol> : <p className="sd-empty">Choose a course to build your plan. Assignments and review will appear here when they are ready.</p>}<p className="sd-plan-note sd-desktop-only">Deadlines first, then review, then new learning.</p></section>
    </div>

    <div className="sd-middle-grid">
      <section className="sd-card" id="assignments"><CardHeading icon="assignments" title="Assignments"><Link className="sd-link" href="/student/assignments">All</Link></CardHeading>{d.assignmentCards.length ? <div className="sd-assignment-list">{d.assignmentCards.slice(0, 3).map(w => <article className="sd-assignment" key={w.id}><div className="sd-assignment-main"><Link href={w.href}>{w.title}</Link><span className="sd-badge" data-tone={w.status === "GRADED" ? "success" : w.status === "SUBMITTED" ? "hint" : "warning"}>{w.points !== null ? `${w.points} / ${w.maxPoints}` : w.status === "SUBMITTED" ? "Awaiting marking" : w.status === "GRADED" ? "Result pending" : w.overdue ? "Overdue" : w.status === "UPCOMING" ? "Upcoming" : `Due ${dateLabel(w.dueAt, timeZone, { month: "short", day: "numeric" })}`}</span></div><p className="sd-assignment-meta">{w.status === "SUBMITTED" ? "Submitted · waiting for your teacher" : w.status === "GRADED" ? w.points !== null ? "Results and feedback available" : "Your teacher will publish the result when it is ready" : `${dueLabel(w.dueAt, clock, timeZone)} · ${w.questionsDone} of ${w.questionsTotal} done`}</p></article>)}</div> : <p className="sd-empty">No assignments yet. Join your teacher&apos;s class to see them here.</p>}</section>
      <section className="sd-card sd-review" id="review"><CardHeading icon="review" title="Review due"><Link className="sd-link" href="/student/review">All</Link></CardHeading><div className="sd-review-count"><strong>{reviews.length}</strong><span>{reviews.length === 1 ? "question" : "questions"}{reviews.length > 0 && ` · ≈ ${reviewMinutes} min`}</span></div>{reviews.length > 0 ? <><div className="sd-review-tags">{reviewTags.map(title => <Link key={title} href={reviews.find(q => q.lessonTitle === title)!.href}>{title} · {reviews.filter(q => q.lessonTitle === title).length}</Link>)}</div><p className="sd-review-note">Return to a fresh variant when one is available, so you practise the method.</p><div className="sd-review-action"><ButtonLink variant="primary" href={reviewHref!}>Start review</ButtonLink></div></> : <p className="sd-empty">Nothing is due right now. Your answers will shape what to revisit next.</p>}</section>
      <section className="sd-card"><CardHeading icon="feedback" title="New feedback">{d.feedback.length > 0 && <span className="sd-count-badge" aria-label={`${d.feedback.length} recent feedback items`}>{d.feedback.length}</span>}</CardHeading>{d.feedback.length ? <div className="sd-feedback-list">{d.feedback.slice(0, 2).map(f => <Link href={f.href} className="sd-feedback" key={f.id}><div className="sd-feedback-meta"><span className="sd-badge" data-tone="success">Teacher</span><span>{f.title}</span></div><p>{f.points !== null && `${f.points} / ${f.maxPoints}`}{f.comment ? `${f.points !== null ? " · " : ""}${f.comment}` : " · View your feedback"}</p></Link>)}</div> : <p className="sd-empty">Your teacher&apos;s published feedback will appear here.</p>}<div className="sd-connection-note"><DashboardIcon name="lock"/><div><strong>AI checking · Plus</strong><p>{d.entitlements.aiChecking ? "Your access is active. AI checking will be available after the service is connected." : "AI checking is a Plus feature. The service is not connected yet."}</p>{d.entitlements.aiChecking ? <Button disabled aria-describedby="ai-connection-status">AI checking not connected</Button> : <Link className="sd-link" href="/access">View Plus access →</Link>}<span id="ai-connection-status" className="sd-mobile-only">No AI request has been made.</span></div></div></section>
    </div>

    <section className="sd-courses-section" id="my-courses"><div className="sd-section-heading"><h2>My courses</h2><Legend/></div><ErrorNotice error={error}/>{(editing || !d.selectedCourses.length) && <div className="sd-card sd-course-picker"><div className="sd-card-heading"><h3>Choose your courses</h3>{d.selectedCourses.length > 0 && <Button onClick={() => setEditing(false)}>Done choosing</Button>}</div><p className="sd-muted">Removing a course keeps all its progress.</p><ErrorNotice error={choices.error}/>{!choices.data ? <Loading/> : <fieldset disabled={busy || !!lens}><legend className="sr-only">Selected courses</legend>{choices.data.map(c => <label key={c.id}><Input type="checkbox" checked={d.selectedCourses.some(s => s.id === c.id)} onChange={e => void toggleCourse(c.id, e.target.checked)}/><span>{c.title}</span></label>)}</fieldset>}</div>}{featured && <div className="sd-course-grid">{courseCard(featured, true)}<div className="sd-course-stack">{others.map(c => courseCard(c))}<Button className="sd-add-course" disabled={!!lens} onClick={() => setEditing(!editing)}>+ {editing ? "Done choosing" : "Add a course"}</Button></div></div>}{unready.map(c => <article className="sd-card sd-course-card" key={c.id}><h3>{c.title}</h3><p className="sd-muted">{c.locked ? "Your course is saved. Access is required to open its materials." : "Your course is saved. Materials are being prepared."}</p><ButtonLink href={c.locked ? "/access" : "/courses/" + c.slug}>{c.locked ? "View access" : "Open course"}</ButtonLink></article>)}<Legend mobile/></section>

    <div className="sd-bottom-grid">
      <section className={`sd-card ${d.entitlements.analytics ? "" : "sd-locked"}`}><CardHeading icon="focus" title="Focus areas">{!d.entitlements.analytics && <PlusBadge/>}</CardHeading>{d.focusAreas ? <><p className="sd-muted">Where to focus — from your own answers.</p>{d.focusAreas.length ? <div className="sd-focus-list">{d.focusAreas.slice(0, 3).map(f => <div className="sd-focus-row" key={f.lessonId}><div><strong>{f.title}</strong><p className="sd-muted">{f.incorrectCount ? `${f.incorrectCount} question ${f.incorrectCount === 1 ? "family" : "families"} to work on` : f.helpedCount ? `${f.helpedCount} practised with help` : `${f.dueCount} ready for review`}</p></div><ButtonLink href={f.href}>{f.dueCount ? "Review now" : "Practise"}</ButtonLink></div>)}</div> : <p className="sd-empty">Try some questions first. Your focus areas will use your own results.</p>}</> : <LockedAnalytics text="See patterns in your answers and choose the skills that need your attention."/>}</section>
      <section className={`sd-card ${d.entitlements.analytics ? "" : "sd-locked"}`}><CardHeading icon="flag" title="Exam readiness">{d.entitlements.analytics ? <ExamDate userId={actor.id} readOnly={!!lens}/> : <PlusBadge/>}</CardHeading>{d.examReadiness ? <>{[...d.examReadiness.courses].sort((a,b) => Number(b.id === current?.courseId) - Number(a.id === current?.courseId) || (d.courses.find(c => c.id === b.id)?.practisedLessons ?? 0) - (d.courses.find(c => c.id === a.id)?.practisedLessons ?? 0)).slice(0,2).map(c => {
        const course = d.courses.find(item => item.id === c.id), coverage = course && course.totalLessons ? course.practisedLessons / course.totalLessons * 100 : 0;
        return <div className="sd-readiness-course" key={c.id}><h3>{c.title}</h3><div className="sd-readiness-row"><span className="sd-readiness-label">Topics practised</span><Meter value={coverage} total={100} label={c.title + " topics practised"}/><strong className="sd-readiness-value">{Math.round(coverage)}%</strong></div><div className="sd-readiness-row"><span className="sd-readiness-label">Exam-style average</span><Meter value={c.average ?? 0} total={100} success label={c.title + " published exam-style average"}/><strong className="sd-readiness-value">{c.average === null ? "—" : `${Math.round(c.average)}%`}</strong></div><p className="sd-readiness-note">{c.markedQuestions} {c.markedQuestions === 1 ? "question" : "questions"} marked · {c.markedBy.teacher.questions} by teacher, {c.markedBy.automatic.questions} automatically{c.markedBy.self.questions ? ` · ${c.markedBy.self.questions} self-assessed separately` : ""}</p></div>;
      })}<p className="sd-readiness-footnote">Coverage and published marks only — no grade prediction. Reading notes alone does not increase coverage.</p></> : <LockedAnalytics text="Follow topic coverage and published exam-style results, with self-assessment kept separate."/>}</section>
    </div>

    <div className="sd-utility-grid"><section className="sd-card sd-utility" id="mistake-notebook"><DashboardIcon name="book"/><div><h2>Mistake notebook</h2><p className="sd-muted">{d.notebook.mistakesCount} question {d.notebook.mistakesCount === 1 ? "family" : "families"} to revisit</p></div>{d.notebook.mistakesCount ? <ButtonLink href={d.notebook.mistakesHref}>Retry now</ButtonLink> : <Link className="sd-link" href="/student/notebook">Open notebook</Link>}</section><section className="sd-card sd-utility"><DashboardIcon name="bookmark"/><div><h2>Bookmarks</h2><p className="sd-muted">{d.notebook.bookmarkedCount} saved {d.notebook.bookmarkedCount === 1 ? "question" : "questions"}</p></div><Link className="sd-link" href={d.notebook.bookmarksHref}>Open</Link></section></div>
    {d.courses.some(c => c.slug === "maths4u-9709-p1") && <details className="sd-card sd-earlier-practice" onToggle={e => setEarlierOpen(e.currentTarget.open)}><summary>Review from your earlier Pure 1 practice</summary>{earlierOpen && <Pure1Review/>}</details>}
    <nav className="sd-footer-links" aria-label="More learning tools"><Link href="/student/progress">Previous results &amp; feedback</Link><Link href="/join-class">Join a class</Link><Link href="/search">Find a topic</Link></nav>
  </div>;
}

export function StudentPracticeQueue({ mistakes = false }: { mistakes?: boolean }) {
  const actor = useContext(ActorContext), zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const r = useResource<StudentDashboardDto>(actor ? "dashboard/student?timeZone=" + encodeURIComponent(zone) : null);
  if (r.error) return <ErrorNotice error={r.error}/>;
  if (!r.data) return <Loading/>;
  const items = mistakes ? r.data.mistakeQuestions : r.data.reviewQuestions;
  return <div className="student-dashboard sd-queue" lang="en"><Link className="sd-link" href="/student">← Dashboard</Link><header className="sd-greeting-copy"><h1>{mistakes ? "Mistake notebook" : "Your review"}</h1><p className="sd-muted">{mistakes ? "Learn from your answers. Try another variant where one is available." : "Questions ready to revisit, from your own practice."}</p></header>
    <section className="sd-card"><CardHeading icon={mistakes ? "book" : "review"} title={`${items.length} ${items.length === 1 ? "question family" : "question families"}`}>{items[0] && <ButtonLink variant="primary" href={items[0].href}>{mistakes ? "Retry now" : "Start review"}</ButtonLink>}</CardHeading>{items.length ? <div className="sd-queue-list">{items.map(q => <article className="sd-queue-item" key={q.lessonId + ":" + q.family}><div><p className="sd-muted">{q.courseTitle} · {q.lessonTitle}</p><h3>{q.title}</h3><p className="sd-muted">{q.reason}</p></div><ButtonLink href={q.href}>Try question →</ButtonLink></article>)}</div> : <div className="sd-locked-state"><DashboardIcon name={mistakes ? "book" : "review"}/><h3>{mistakes ? "A fresh page" : "You are up to date"}</h3><p>{mistakes ? "Questions will appear here when your answers show something to revisit." : "Continue learning. Your next review will be based on your own answers."}</p><ButtonLink href="/student">Back to learning</ButtonLink></div>}</section>
  </div>;
}
