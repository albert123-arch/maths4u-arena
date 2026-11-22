import type { Prisma } from "../generated/prisma/client";
import { approvedWhere } from "./content-access";
import { examArchiveSyllabuses } from "./exam-archive-access";
import { archiveLegacyLessonIds } from "./exam-archive-lesson-links";
import { db } from "./prisma";

export const archiveOriginalTaskWhere = {
  ...approvedWhere, origin: "ORIGINAL", visibility: "PUBLIC",
  archivedAt: null, examArchivedAt: null, featureKey: null, versions: { some: {} },
} satisfies Prisma.TaskWhereInput;

const publishedCourse = { published: true, archivedAt: null, featureKey: null } satisfies Prisma.CourseWhereInput;
const paperFields = { id: true, syllabus: true, year: true, session: true, paperCode: true } satisfies Prisma.ExamArchivePaperSelect;
const refreshAfter = 5 * 60_000;
type Counts = Awaited<ReturnType<typeof readCounts>>;
let snapshot: { value: Counts; expires: number } | undefined;
let refreshing: Promise<Counts> | undefined;

// These counts contain only aggregate numbers. Access is checked before returning
// any programme to a reader. Each worker shares one refresh across archive requests.
export function examArchiveCounts() {
  if (snapshot && snapshot.expires > Date.now()) return Promise.resolve(snapshot.value);
  refreshing ??= readCounts().then(value => {
    snapshot = { value, expires: Date.now() + refreshAfter };
    return value;
  }).finally(() => { refreshing = undefined; });
  return refreshing;
}

async function readCounts() {
  const client = db();
  const [topics, questions, original, papers] = await Promise.all([
    client.examArchiveTopic.findMany({
      select: { id: true, syllabus: true, lessonId: true, courseSlug: true },
    }),
    client.examArchiveQuestion.findMany({
      where: { syllabus: { in: [...examArchiveSyllabuses] }, papers: { some: {} } },
      select: {
        id: true, syllabus: true, topics: { select: { topicId: true } }, papers: { select: { paper: { select: { syllabus: true } } } },
        taskVersion: { select: { task: { select: { archivePlacements: {
          where: { method: { in: ["PROVENANCE", "APPROVED_MAP"] } },
          select: { targetLessonId: true, course: { select: { slug: true } } },
        } } } } },
      },
    }),
    client.lessonTask.groupBy({
      by: ["lessonId"], _count: { _all: true },
      where: { task: archiveOriginalTaskWhere, lesson: { archivedAt: null, topic: { course: {
        ...publishedCourse, OR: examArchiveSyllabuses.map(code => ({ slug: { startsWith: "maths4u-" + code } })),
      } } } },
    }),
    client.examArchivePaper.findMany({
      where: { syllabus: { in: [...examArchiveSyllabuses] }, questions: { some: {} } },
      select: { ...paperFields, questions: { select: { number: true, question: { select: { marks: true, syllabus: true } } } } },
      orderBy: [{ year: "desc" }, { session: "asc" }, { paperCode: "asc" }],
    }),
  ]);
  const originalByLesson = new Map(original.map(({ lessonId, _count }) => [lessonId, _count._all]));
  const indexedTopics = new Map(topics.map(topic => [topic.id, topic]));
  const examByTopic = new Map<string, number>();
  const examByLesson = new Map<string, number>();
  const lessonKey = (course: string, lesson: string) => `${course}/${lesson}`;
  for (const question of questions) {
    if (!question.papers.some(row => row.paper.syllabus === question.syllabus)) continue;
    const lessons = new Set<string>();
    for (const { topicId } of question.topics) {
      const topic = indexedTopics.get(topicId);
      if (topic?.syllabus !== question.syllabus) continue;
      examByTopic.set(topicId, (examByTopic.get(topicId) ?? 0) + 1);
      const lesson = topic.lessonId ?? archiveLegacyLessonIds[topic.id];
      if (topic.courseSlug && lesson) lessons.add(lessonKey(topic.courseSlug, lesson));
    }
    if (question.syllabus === "0606" || question.syllabus === "9231") {
      for (const placement of question.taskVersion?.task.archivePlacements ?? []) {
        if (placement.targetLessonId) lessons.add(lessonKey(placement.course.slug, placement.targetLessonId));
      }
    }
    for (const key of lessons) examByLesson.set(key, (examByLesson.get(key) ?? 0) + 1);
  }
  return { examByTopic, examByLesson, originalByLesson, papers: papers.flatMap(paper => {
    const questions = paper.questions.filter(row => row.question.syllabus === paper.syllabus);
    return questions.length ? [archivePaperSummary(paper, questions)] : [];
  }) };
}

export function archiveQuestionCounts(counts: Counts, topic: { id: string; courseSlug: string | null; lessonId: string | null }) {
  const lesson = topic.courseSlug && topic.lessonId ? `${topic.courseSlug}/${topic.lessonId}` : "";
  return {
    exam: (topic.id.startsWith("arena_") ? counts.examByLesson.get(lesson) : counts.examByTopic.get(topic.id)) ?? 0,
    practice: topic.lessonId ? counts.originalByLesson.get(topic.lessonId) ?? 0 : 0,
  };
}

type PaperFields = Prisma.ExamArchivePaperGetPayload<{ select: typeof paperFields }>;
type PaperMarks = { number: string; question: { marks: number | null } };

export function archivePaperSummary({ id, syllabus, year, session, paperCode }: PaperFields, questions: PaperMarks[]) {
  // Alternate printed questions share a score, and missing marks make the sum ambiguous.
  const numbers = new Set(questions.map(row => Number(row.number.match(/^\d+/)?.[0])));
  const complete = questions.length > 0 && !numbers.has(NaN) && numbers.size === questions.length && questions.every(row => row.question.marks !== null);
  return {
    id, syllabus, year, session, paperCode, questionCount: questions.length,
    marks: complete ? questions.reduce((sum, row) => sum + (row.question.marks ?? 0), 0) : null,
  };
}
