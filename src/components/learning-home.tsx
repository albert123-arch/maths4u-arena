"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Input } from "./controls";
import { ErrorNotice, Loading, useResource } from "./ui";
import type { courseChoices } from "@/lib/learning-home";
import { compareLearningCourses, courseDirection, courseLabel, courseLevels } from "@/lib/discovery-model";
import { StudentDashboard } from "./student-dashboard";

type StartingPoint = { direction?: string | null; courseSlug?: string } | null;
type Course = Awaited<ReturnType<typeof courseChoices>>[number];
function groupFor(course: Course) { return courseDirection(course.slug) ?? 'other'; }

export function CourseSelection({ origin, teacher, children }: {
  origin: StartingPoint; teacher: boolean; children: (courseSlugs: string[]) => ReactNode;
}) {
  const r = useResource<Awaited<ReturnType<typeof courseChoices>>>("learning/course-choices?counts=lessons");
  const [selection, setSelection] = useState<string | null>(null);
  const [picks, setPicks] = useState<string[] | null>(null);
  const stepHeading = useRef<HTMLLegendElement>(null);
  useEffect(() => { if (selection) stepHeading.current?.focus(); }, [selection]);
  const choices = r.data ?? [];
  const initial = choices.find(course => course.slug === origin?.courseSlug);
  const level = selection ?? (teacher ? 'later' : initial ? groupFor(initial) : origin?.direction);
  const current = choices.filter(c => groupFor(c) === level).sort(compareLearningCourses);
  const initialPicks = initial && groupFor(initial) === level ? [initial.slug] : current.length === 1 ? [current[0].slug] : [];
  const selected = current.filter(c => (picks ?? initialPicks).includes(c.slug)).map(c => c.slug);
  const stepTwo = current.length > 0;
  const later = level === 'later';
  function chooseLevel(key: string) { setSelection(key); setPicks(null); }
  return <>
    <ErrorNotice error={r.error}/>
    {r.error && <Button type="button" onClick={r.refresh}>Reload courses</Button>}
    {!later && !r.data && !r.error && <Loading/>}
    {!later && r.data && !stepTwo && <fieldset className="signup-levels">
      <legend ref={stepHeading} tabIndex={-1}>1. Your level</legend>
      <div className="signup-level-grid">
        {courseLevels.map(l => {
          const courses = choices.filter(c => groupFor(c) === l.key);
          if (!courses.length) return null;
          const lessons = courses.reduce((sum, c) => sum + (c.lessons ?? 0), 0);
          return <button type="button" key={l.key} onClick={() => chooseLevel(l.key)}>
            <span className="signup-card-top"><strong>{l.code}</strong>{l.popular && <small>Popular</small>}</span>
            <span>{l.title}</span><small>Ages {l.age} · {lessons} {lessons === 1 ? 'lesson' : 'lessons'}</small>
          </button>;
        })}
      </div>
      {['olympiad', 'other'].filter(key => choices.some(c => groupFor(c) === key)).map(key => <Button type="button" variant="text" key={key} onClick={() => chooseLevel(key)}>{key === 'olympiad' ? 'Olympiad courses' : 'Other courses'}</Button>)}
    </fieldset>}
    {stepTwo && <fieldset className="learning-course-picker signup-courses">
      <legend ref={stepHeading} tabIndex={-1}>2. Your courses</legend>
      <p className="muted">Choose one or more courses to show on your dashboard.</p>
      {current.map(c => <label key={c.id}><Input type="checkbox" checked={selected.includes(c.slug)} onChange={e => setPicks(e.target.checked ? [...selected, c.slug] : selected.filter(s => s !== c.slug))}/><span>{courseLabel(c.slug, c.title)}</span></label>)}
    </fieldset>}
    <div className="signup-change row">
      {(later || stepTwo) && <Button type="button" variant="text" onClick={() => chooseLevel('choose')}>{teacher && later ? 'Choose teaching courses (optional)' : 'Change level'}</Button>}
      {!later && <Button type="button" variant="text" onClick={() => chooseLevel('later')}>Choose courses later</Button>}
    </div>
    <div hidden={!later && !selected.length}>{children(selected)}</div>
  </>;
}
export function MyLearning({ sessionReady = true }: { sessionReady?: boolean }) {
  return sessionReady ? <StudentDashboard/> : <Loading/>;
}
