import { db } from "./prisma";
import { localized } from "./content";
import { type Actor } from "./security";
import { hasFeature } from "./subscriptions";
import { squareLessonId, squarePath, type QuadraticTopic, quadraticTopic } from "./square-model";
import { assertLessonVisible, visibleCourseWhere, visibleLessonWhere } from "./content-access";
import { lensAttemptScope } from "./request-view";

export async function courseChoices() {
  const rows = await db().course.findMany({ where: { published: true, archivedAt: null, featureKey: null, ...visibleCourseWhere(null) }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, slug: true, texts: { select: { locale: true, title: true } } } });
  return rows.map(c => ({ id: c.id, slug: c.slug, title: localized(c.texts, "en").title }));
}
export async function learningHome(actor: Actor, lang: string) {
  const follows = await db().courseFollow.findMany({ where: { userId: actor.id, course: { published: true, archivedAt: null, ...visibleCourseWhere(actor) } }, include: { course: { include: { texts: true, topics: { include: { lessons: { where: { archivedAt: null, ...visibleLessonWhere(actor) }, select: { id: true } } } } } } } });
  const courses = await Promise.all(follows.map(async f => {
    const c = f.course, lessonIds = c.topics.flatMap(t => t.lessons.map(l => l.id)), allowed = !c.featureKey || await hasFeature(actor, c.featureKey);
    if (!allowed) return { id: c.id, slug: c.slug, title: localized(c.texts, lang).title, locked: true, read: 0, lessons: 0, resume: null };
    const opened = await db().learningProgress.findFirst({ where: { userId: actor.id, lessonId: { in: lessonIds } }, orderBy: { openedAt: "desc" }, include: { lesson: { include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } } } } } });
    const study = await db().practiceStudy.findFirst({ where: { lessonId: { in: lessonIds }, attempt: { userId: actor.id, AND: [lensAttemptScope()] } }, orderBy: { updatedAt: "desc" }, include: { lesson: { include: { versions: { take: 1, orderBy: { number: "desc" }, include: { texts: true } } } }, attempt: { select: { id: true, status: true } } } });
    const candidates = [
      ...(opened ? [{ at: opened.openedAt.getTime(), title: localized(opened.lesson.versions[0].texts, lang).title, href: `/courses/${c.slug}/topics/${opened.lessonId}` }] : []),
      ...(study?.lesson ? [{ at: study.updatedAt.getTime(), title: localized(study.lesson.versions[0].texts, lang).title, href: study.attempt.status === "IN_PROGRESS" ? `/attempts/${study.attempt.id}` : `/courses/${c.slug}/topics/${study.lessonId}` }] : []),
    ].sort((a,b) => b.at - a.at);
    return { id: c.id, slug: c.slug, title: localized(c.texts, lang).title, locked: false, read: await db().learningProgress.count({ where: { userId: actor.id, lessonId: { in: lessonIds }, completed: true } }), lessons: lessonIds.length, resume: candidates[0] ?? (lessonIds.includes(squareLessonId) ? { title: "Completing the square", href: squarePath, at: 0 } : null) };
  }));
  return { courses };
}
export async function openSquareLesson(actor: Actor, topic: QuadraticTopic = quadraticTopic()) {
  const squareLessonId = topic.lessonId;
  await assertLessonVisible(actor, squareLessonId);
  // Opening the new lesson must not reset an existing completion flag.
  return db().learningProgress.upsert({ where: { userId_lessonId: { userId: actor.id, lessonId: squareLessonId } }, create: { userId: actor.id, lessonId: squareLessonId, completed: false }, update: { openedAt: new Date() } });
}
