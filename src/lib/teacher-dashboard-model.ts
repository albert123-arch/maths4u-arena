// Pure projections of authorised class data. No student responses or private
// quick-check history enter this model, and reading notes is never mastery.
export type TeacherStudent = { id: string; displayName: string; username: string };
export type TeacherClass = { id: string; title: string; joinCode: string; students: TeacherStudent[] };
export type TeacherQuestion = { id: string; title: string; maximum: number; examStyle: boolean; locations: { courseId: string; chapterId: string; lessonId: string; href: string }[] };
export type TeacherAttempt = { id: string; userId: string; student: string; status: string; startedAt: number; submittedAt: number | null; markedAt?: number | null; expiresAt: number; pending: boolean; helped: boolean; questions: (TeacherQuestion & { points: number | null })[] };
export type TeacherWork = { id: string; title: string; classId: string | null; classTitle: string | null; kind: string; archived: boolean; resultsPublished: boolean; versions: { id: string; opensAt: number; dueAt: number; questions: TeacherQuestion[]; attempts: TeacherAttempt[] }[] };
export type TeacherPractice = TeacherAttempt & { repeat: boolean; classIds: string[] };
export type TeacherCourse = { id: string; title: string; slug: string };
export type TeacherChapter = { id: string; title: string; lessons: { id: string; title: string; href: string; questions: TeacherQuestion[] }[] };
export type TeacherEvidence = { userId: string; taskId: string; title: string; attemptId: string; at: number; activityAt: number; markedAt: number | null; points: number | null; maximum: number; examStyle: boolean; helped: boolean; repeat: boolean; verified: boolean; href: string; classIds: string[]; locations: TeacherQuestion['locations'] };
export type TeacherCell = { chapterId: string; total: number; solved: number; tried: number; due: number; untouched: number; evidence: TeacherEvidence[] };
export function hasUnmarkedManualPart(parts:{id:string;kind:string}[],answers:{partId:string;review?:{points:number|null}|null}[]){return parts.some(p=>p.kind==='MANUAL'&&answers.find(a=>a.partId===p.id)?.review?.points==null);}

function latestAttempts(attempts: TeacherAttempt[]) {
  const latest = new Map<string, TeacherAttempt>();
  for (const a of attempts) { const old = latest.get(a.userId); if (!old || a.startedAt > old.startedAt || a.startedAt === old.startedAt && a.id > old.id) latest.set(a.userId, a); }
  return latest;
}
export function teacherWorkSummary(work: TeacherWork, classes: TeacherClass[], now: number) {
  const v = work.versions[0], roster = classes.find(c => c.id === work.classId)?.students ?? [];
  const latest = latestAttempts(v.attempts.filter(a => roster.some(s => s.id === a.userId)));
  const submitted = [...latest.values()].filter(a => a.status === 'GRADED' || a.status === 'SUBMITTED').length;
  const inProgress = [...latest.values()].filter(a => a.status === 'IN_PROGRESS').length;
  const marked = [...latestAttempts(v.attempts.filter(a => roster.some(s => s.id === a.userId) && a.status === 'GRADED' && a.questions.every(q => q.points !== null))).values()];
  const points = marked.flatMap(a => a.questions).reduce((n, q) => n + (q.points ?? 0), 0), maximum = marked.flatMap(a => a.questions).reduce((n, q) => n + q.maximum, 0);
  const pending = work.versions.flatMap(v => v.attempts).filter(a => a.pending).length;
  return { id: work.id, title: work.title, classId: work.classId, classTitle: work.classTitle ?? 'No class', kind: work.kind, archived: work.archived, resultsPublished: work.resultsPublished,
    opensAt: v.opensAt, dueAt: v.dueAt, scheduled: v.opensAt > now, closed: v.dueAt <= now, total: roster.length, submitted, inProgress,
    notStarted: Math.max(0, roster.length - submitted - inProgress), pending, average: maximum > 0 ? Math.round(points / maximum * 100) : null,
    markedStudents: marked.length, href: '/works/' + work.id + '/results', missingUserIds: roster.filter(s => !['SUBMITTED', 'GRADED'].includes(latest.get(s.id)?.status ?? '')).map(s => s.id) };
}
function latestEvidence(rows: TeacherEvidence[]) {
  const latest = new Map<string, TeacherEvidence>();
  for (const row of rows) for (const classId of row.classIds) { const key = row.userId + ':' + row.taskId + ':' + classId, old = latest.get(key); if (!old || row.at > old.at || row.at === old.at && row.attemptId > old.attemptId) latest.set(key, { ...row, classIds: [classId] }); }
  return [...latest.values()];
}
function examAverage(rows: TeacherEvidence[]) {
  const scored = rows.filter(r => r.verified && r.examStyle && r.points !== null && r.maximum > 0);
  const maximum = scored.reduce((n, r) => n + r.maximum, 0);
  return { average: maximum ? Math.round(scored.reduce((n, r) => n + r.points!, 0) / maximum * 100) : null, markedQuestions: scored.length };
}
export function teacherDashboardModel(input: { classes: TeacherClass[]; works: TeacherWork[]; practice: TeacherPractice[]; courses: TeacherCourse[]; chapters: TeacherChapter[]; courseId: string; classId: string | null; now: number; weekStart: number }) {
  const { now } = input, classes = input.classId ? input.classes.filter(c => c.id === input.classId) : input.classes;
  const works = input.works.filter(w => !input.classId || w.classId === input.classId), summaries = works.map(w => teacherWorkSummary(w, input.classes, now));
  const active = summaries.filter(w => !w.archived), liveWorks = works.filter(w => !w.archived);
  const studentIds = new Set(classes.flatMap(c => c.students.map(s => s.id)));
  const practice = input.practice.filter(p => !input.classId || p.classIds.includes(input.classId));
  const pending = [
    ...liveWorks.flatMap(w => w.versions.flatMap(v => v.attempts.filter(a => a.pending).map(a => ({ id: a.id, userId: a.userId, student: a.student, title: w.title, classId: w.classId, classTitle: w.classTitle ?? 'No class', submittedAt: a.submittedAt, workId: w.id })))),
    ...practice.filter(a => a.pending).map(a => ({ id: a.id, userId: a.userId, student: a.student, title: a.questions[0]?.title ?? 'Independent practice', classId: a.classIds[0] ?? null, classTitle: 'Completed independent practice', submittedAt: a.submittedAt, workId: null })),
  ].sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0) || a.id.localeCompare(b.id));
  const evidence: TeacherEvidence[] = [];
  for (const w of works) for (const v of w.versions) for (const a of v.attempts) for (const q of a.questions) evidence.push({ userId: a.userId, taskId: q.id, title: q.title, attemptId: a.id,
    at: a.startedAt, activityAt: Math.max(a.startedAt,a.submittedAt??0), markedAt:a.markedAt??a.submittedAt, points: q.points, maximum: q.maximum, examStyle: q.examStyle, helped: a.helped, repeat: a.status === 'GRADED' && q.points !== null && q.points < q.maximum,
    verified: a.status === 'GRADED' && q.points !== null, href: '/attempts/' + a.id + '/review', classIds: w.classId ? [w.classId] : [], locations: q.locations });
  for (const a of practice) for (const q of a.questions) evidence.push({ userId: a.userId, taskId: q.id, title: q.title, attemptId: a.id, at: a.startedAt, activityAt:Math.max(a.startedAt,a.submittedAt??0),markedAt:a.markedAt??a.submittedAt,points: q.points, maximum: q.maximum, examStyle: q.examStyle,
    helped: a.helped, repeat: a.repeat || a.status === 'GRADED' && q.points !== null && q.points < q.maximum, verified: a.status === 'GRADED' && q.points !== null,
    href: '/attempts/' + a.id + '/review', classIds: a.classIds, locations: q.locations });
  const latest = latestEvidence(evidence.filter(e => studentIds.has(e.userId)));
  const latestMarked = latestEvidence(evidence.filter(e => studentIds.has(e.userId) && e.verified));
  const progressClass = classes.find(c => c.id === input.classId) ?? classes[0] ?? null;
  const relevant = (e: TeacherEvidence) => e.locations.some(l => l.courseId === input.courseId);
  const progressRows = (progressClass?.students ?? []).map(s => ({ ...s, href: `/teacher/classes/${progressClass!.id}/students/${s.id}`,
    ...examAverage(latestMarked.filter(e => e.userId === s.id && e.classIds.includes(progressClass!.id) && relevant(e))), cells: input.chapters.map(ch => {
      const tasks = new Set(ch.lessons.flatMap(l => l.questions.map(q => q.id))), rows = latest.filter(e => e.userId === s.id && e.classIds.includes(progressClass!.id) && tasks.has(e.taskId));
      const due = rows.filter(r => r.repeat).length, solved = rows.filter(r => !r.repeat && r.verified && r.points === r.maximum && !r.helped).length;
      return { chapterId: ch.id, total: tasks.size, due, solved, tried: rows.length - due - solved, untouched: tasks.size - rows.length, evidence: rows } satisfies TeacherCell;
    }) }));
  const attention = [...new Map(classes.flatMap(c => c.students.map(s => {
    const overdue = active.filter(w => w.classId === c.id && w.dueAt <= now && w.missingUserIds.includes(s.id));
    const repeats = latest.filter(e => e.userId === s.id && e.classIds.includes(c.id) && e.repeat), reason = overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'assignment' : 'assignments'} overdue` : repeats.length ? `${repeats.length} marked ${repeats.length === 1 ? 'question needs' : 'questions need'} another look` : null;
    return { ...s, classId: c.id, classTitle: c.title, reason, overdue: overdue.length, repeats: repeats.length, href: `/teacher/classes/${c.id}/students/${s.id}`, workHref: overdue[0]?.href ?? null };
  })).filter(s => s.reason).sort((a, b) => b.overdue - a.overdue || b.repeats - a.repeats || a.displayName.localeCompare(b.displayName)).filter((s, i, rows) => rows.findIndex(r => r.id === s.id) === i).map(s => [s.id, s])).values()];
  const difficulties = new Map<string, { taskId: string; title: string; studentIds: string[]; lessonId: string | null; href: string }>();
  const progressStudentIds = new Set(progressClass?.students.map(s => s.id) ?? []);
  for (const e of latestMarked.filter(e => progressStudentIds.has(e.userId) && e.classIds.includes(progressClass!.id) && relevant(e) && e.points !== null && e.points < e.maximum && (e.markedAt??e.activityAt) >= input.weekStart)) {
    const old = difficulties.get(e.taskId), location = e.locations.find(l => l.courseId === input.courseId);
    difficulties.set(e.taskId, { taskId: e.taskId, title: e.title, studentIds: [...(old?.studentIds ?? []), e.userId], lessonId: location?.lessonId ?? null, href: location?.href ?? '/courses' });
  }
  const upcoming = active.flatMap(w => [{ workId: w.id, title: w.title, classTitle: w.classTitle, at: w.opensAt, kind: 'opens' as const, submitted: w.submitted, total: w.total, href: w.href },
    { workId: w.id, title: w.title, classTitle: w.classTitle, at: w.dueAt, kind: 'due' as const, submitted: w.submitted, total: w.total, href: w.href }]).filter(e => e.at >= now && e.at < now + 7 * 86400000).sort((a, b) => a.at - b.at);
  const prepared = input.chapters.flatMap(ch => ch.lessons).find(l => l.questions.some(q => !progressRows.length || progressRows.some(s => !latest.some(e => e.userId === s.id && e.classIds.includes(progressClass!.id) && e.taskId === q.id && e.verified && e.points === e.maximum && !e.helped && !e.repeat)))) ?? input.chapters[0]?.lessons[0] ?? null;
  return { classes: classes.map(c => { const ids = new Set(c.students.map(s => s.id)), rows = latest.filter(e => ids.has(e.userId) && e.classIds.includes(c.id)); return { ...c,
    assignments: active.filter(w => w.classId === c.id).length, activeThisWeek: new Set(rows.filter(r => r.activityAt >= input.weekStart).map(r => r.userId)).size,
    overdue: active.filter(w => w.classId === c.id && w.closed && w.missingUserIds.length > 0).length, ...examAverage(latestMarked.filter(e=>ids.has(e.userId)&&e.classIds.includes(c.id))) }; }),
    classOptions: input.classes.map(c => ({ id: c.id, title: c.title })), courses: input.courses, selectedClassId: input.classId, selectedCourseId: input.courseId,
    summary: { classes: classes.length, students: studentIds.size, assignments: active.filter(w => !w.closed).length },
    assignments: summaries.sort((a, b) => Number(a.archived) - Number(b.archived) || Number(a.closed && !a.pending) - Number(b.closed && !b.pending) || a.dueAt - b.dueAt),
    pending, pendingCount: pending.length, attention, upcoming,
    progress: { classroom: progressClass ? { id: progressClass.id, title: progressClass.title } : null, course: input.courses.find(c => c.id === input.courseId) ?? null, chapters: input.chapters.map(ch => ({ id: ch.id, title: ch.title })), students: progressRows,
      chapterAverages: input.chapters.map(ch => { const cells = progressRows.flatMap(s => s.cells.filter(c => c.chapterId === ch.id)); const total = cells.reduce((n, c) => n + c.total, 0); return { id: ch.id, percent: total ? Math.round(cells.reduce((n, c) => n + c.solved, 0) / total * 1000) / 10 : null }; }), ...examAverage(latestMarked.filter(e => progressStudentIds.has(e.userId) && e.classIds.includes(progressClass!.id) && relevant(e))) },
    difficulties: [...difficulties.values()].sort((a, b) => b.studentIds.length - a.studentIds.length || a.title.localeCompare(b.title)).slice(0, 3),
    preparation: prepared ? { id: prepared.id, title: prepared.title, href: prepared.href, courseTitle: input.courses.find(c => c.id === input.courseId)?.title ?? 'Course', classId: progressClass?.id ?? null } : null,
    aiConnected: false as const };
}
export type TeacherDashboardModel = ReturnType<typeof teacherDashboardModel>;
