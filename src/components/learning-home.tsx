"use client";
import { Input } from "./controls";
import { ErrorNotice, Loading, useResource } from "./ui";
import type { courseChoices } from "@/lib/learning-home";
import { StudentDashboard } from "./student-dashboard";

export function CourseSelection({ selected, onChange }: { selected: string[]; onChange: (slugs: string[]) => void }) {
  const r = useResource<Awaited<ReturnType<typeof courseChoices>>>("learning/course-choices");
  return <fieldset className="learning-course-picker"><legend>Your courses</legend><p className="muted">Choose what you study. You can change this later without losing any work.</p><ErrorNotice error={r.error} />{!r.data ? <Loading /> : r.data.map(c => <label key={c.id}><Input type="checkbox" checked={selected.includes(c.slug)} onChange={e => onChange(e.target.checked ? [...selected, c.slug] : selected.filter(s => s !== c.slug))} /><span>{c.title}</span></label>)}</fieldset>;
}
export function MyLearning({ sessionReady = true }: { sessionReady?: boolean }) {
  return sessionReady ? <StudentDashboard/> : <Loading/>;
}
