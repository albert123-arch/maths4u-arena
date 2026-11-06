"use client";
import { Button, ButtonLink, Input } from "./controls";
import Link from "next/link";
import { useContext, useState } from "react";
import { ActorContext, api, ErrorNotice, Loading, useResource, useLocale } from "./ui";
import { QuadraticsReviewCards, SquareReviewCard } from "./square-progress";
import { Pure1Review } from "./pure1-review";
import type { courseChoices, learningHome } from "@/lib/learning-home";
import { StudentOverview } from "./dashboards";
import { useView } from "./view-state";
export function CourseSelection({ selected, onChange }: { selected: string[]; onChange: (slugs: string[]) => void }) {
  const r = useResource<Awaited<ReturnType<typeof courseChoices>>>("learning/course-choices");
  return <fieldset className="learning-course-picker"><legend>Your courses</legend><p className="muted">Choose what you study. You can change this later without losing any work.</p><ErrorNotice error={r.error} />{!r.data ? <Loading /> : r.data.map(c => <label key={c.id}><Input type="checkbox" checked={selected.includes(c.slug)} onChange={e => onChange(e.target.checked ? [...selected, c.slug] : selected.filter(s => s !== c.slug))} /><span>{c.title}</span></label>)}</fieldset>;
}
export function MyLearning({ sessionReady = true }: { sessionReady?: boolean }) {
  const lens = useView();
  const actor = useContext(ActorContext), { t } = useLocale(), home = useResource<Awaited<ReturnType<typeof learningHome>>>(actor ? "learning/home" : null), choices = useResource<Awaited<ReturnType<typeof courseChoices>>>(actor ? "learning/course-choices" : null);
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  if (!actor) return null;
  if (home.error) return <ErrorNotice error={home.error} />;
  if (!home.data) return <Loading />;
  const selected = home.data.courses, pure1 = selected.some(c => c.slug === "maths4u-9709-p1" && !c.locked);
  async function toggle(id: string, selected: boolean) { setBusy(true); setError(null); try { await api("learning/courses/" + id, "POST", { selected }); home.refresh(); } catch(e) { setError(e); } finally { setBusy(false); } }
  return <div className="my-learning"><header className="square-heading"><p className="eyebrow">{t("Ваше учебное пространство", "Your learning space")}</p><h1>{t("Моё обучение", "My learning")}</h1><p>{t("Ваши курсы, следующий шаг и то, к чему пора вернуться.", "Your courses, your next step and what is ready to revisit.")}</p></header>
    <StudentOverview />
    <section className="card"><div className="row spread"><h2>{t("Мои курсы", "My courses")}</h2><Button className="secondary" disabled={!!lens} onClick={() => setEditing(!editing)}>{editing ? t("Закрыть выбор", "Done choosing") : t("Изменить курсы", "Change courses")}</Button></div>
      {(editing || !selected.length) && <div className="learning-course-picker"><p>Choose courses for this dashboard. Removing a course here keeps all its progress.</p><ErrorNotice error={choices.error} />{choices.data?.map(c => <label key={c.id}><Input type="checkbox" disabled={busy || home.isLoading || !!lens} checked={selected.some(s => s.id === c.id)} onChange={e => void toggle(c.id, e.target.checked)} /><span>{c.title}</span></label>)}</div>}<ErrorNotice error={error} />
      <div className="learning-cards">{selected.map(c => <article key={c.id}><h3><Link href={"/courses/" + c.slug}>{c.title}</Link></h3>{c.locked ? <p>Your course is saved. Access is required to open its materials.</p> : <><p className="muted">{c.read} {c.read === 1 ? "topic" : "topics"} marked as read · {c.lessons} available topics</p>{c.resume && <p>Next: {c.resume.title}</p>}<ButtonLink className="button" href={c.resume?.href ?? "/courses/" + c.slug}>{c.resume?.at ? "Continue learning" : "Start learning"} →</ButtonLink><p><Link href={"/courses/" + c.slug}>Browse this course</Link></p></>}</article>)}</div>
    </section>
    {pure1 && <><QuadraticsReviewCards sessionReady={sessionReady} /><details className="card"><summary>Review from your earlier Pure 1 practice</summary><Pure1Review /></details></>}
    {home.data?.practiceTopics.map(topic=><SquareReviewCard key={topic.key} topic={topic} sessionReady={sessionReady} hideUntouched/>)}
    <nav className="row"><Link href="/student/progress">Previous results & feedback</Link><Link href="/join-class">Join a class</Link></nav>
    <p><Link href="/courses">Explore all courses</Link> · <Link href="/search">Find a topic</Link></p>
  </div>;
}
