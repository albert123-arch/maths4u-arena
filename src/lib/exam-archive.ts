import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { ensure } from "./errors";
import {
  type ExamArchiveAccess, type ExamArchiveSyllabus, examArchiveId, examArchivePreferences, logExamArchiveAccess,
} from "./exam-archive-access";
import { examArchiveOriginals } from "./exam-archive-originals";

export { hasExamArchiveAccess, requireExamArchiveAccess } from "./exam-archive-access";

const topicSelect = {
  id: true, syllabus: true, courseKey: true, courseTitle: true, chapterKey: true, chapterTitle: true,
  chapterOrder: true, title: true, position: true, courseSlug: true, lessonId: true,
} satisfies Prisma.ExamArchiveTopicSelect;
type ListedTopic = Prisma.ExamArchiveTopicGetPayload<{ select: typeof topicSelect }>;

const paperSelect = {
  id: true, syllabus: true, year: true, session: true, paperCode: true, officialUrl: true, markSchemeUrl: true,
} satisfies Prisma.ExamArchivePaperSelect;
type ExamPaper = Prisma.ExamArchivePaperGetPayload<{ select: typeof paperSelect }>;

const questionSelect = {
  id: true, syllabus: true, marks: true, questionType: true, difficulty: true, taskVersionId: true,
  approvalReference: true, studentApproved: true, statementAllowed: true, solutionAllowed: true,
  markSchemeAllowed: true, assetsAllowed: true,
} satisfies Prisma.ExamArchiveQuestionSelect;
export type ExamArchiveQuestionMetadata = Prisma.ExamArchiveQuestionGetPayload<{ select: typeof questionSelect }>;

export function archiveContentRights(access: Pick<ExamArchiveAccess, "admin" | "syllabuses">, question: ExamArchiveQuestionMetadata) {
  if (!(access.syllabuses as readonly string[]).includes(question.syllabus) || !question.taskVersionId ||
    !question.approvalReference?.trim() || !question.statementAllowed || !access.admin && !question.studentApproved) {
    return { statement: false, solution: false, markScheme: false, assets: false };
  }
  return {
    statement: true, solution: question.solutionAllowed, markScheme: question.markSchemeAllowed, assets: question.assetsAllowed,
  };
}

const paperOrder = new Intl.Collator("en", { numeric: true });
const paperTotalMarks = (questions: { number: string; question: { marks: number | null } }[]) => {
  if (!questions.length || questions.some(row => row.question.marks === null)) return null;
  // An alternate printed question shares the score with its counterpart.
  const baseNumbers = new Set<number>();
  let total = 0;
  for (const { number, question } of questions) {
    const numeric = Number(number.match(/^\d+/)?.[0]);
    if (!Number.isFinite(numeric) || baseNumbers.has(numeric)) return null;
    baseNumbers.add(numeric);
    total += question.marks!;
  }
  return total;
};

function toPaperSummary(paper: Pick<ExamPaper, "id" | "syllabus" | "year" | "session" | "paperCode">, questions: { number: string; question: { marks: number | null } }[]) {
  return {
    id: paper.id, syllabus: paper.syllabus, year: paper.year, session: paper.session, paperCode: paper.paperCode,
    questionCount: questions.length, marks: paperTotalMarks(questions),
  };
}

export function officialExamUrl(input: string | null) {
  if (!input) return null;
  try {
    const url = new URL(input);
    const official = url.hostname === "cambridgeinternational.org" || url.hostname.endsWith(".cambridgeinternational.org");
    return url.protocol === "https:" && official && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

const normalize = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, "");
function courseSyllabus(slug: string) {
  return /^maths4u-(9709|9231|0606|0580)(?:-|$)/.exec(slug)?.[1] as ExamArchiveSyllabus | undefined;
}

async function archiveTopics(access: ExamArchiveAccess) {
  const [legacy, courses] = await Promise.all([
    db().examArchiveTopic.findMany({ where: { syllabus: { in: access.syllabuses } }, select: topicSelect, orderBy: [
      { courseKey: "asc" }, { chapterOrder: "asc" }, { position: "asc" },
    ] }),
    db().course.findMany({
      where: {
        published: true, archivedAt: null, featureKey: null,
        OR: access.syllabuses.map(syllabus => ({ slug: { startsWith: "maths4u-" + syllabus } })),
      },
      select: {
        slug: true, texts: { where: { locale: "en" }, select: { title: true } },
        topics: { select: {
          slug: true, position: true, texts: { where: { locale: "en" }, select: { title: true } },
          lessons: { where: {
            archivedAt: null, tasks: { some: { task: { origin: "ORIGINAL", examArchivedAt: null, archivedAt: null, visibility: "PUBLIC", featureKey: null } } },
          }, select: {
            id: true, position: true, versions: { orderBy: { number: "desc" }, take: 1, select: { texts: { where: { locale: "en" }, select: { title: true } } } },
          } },
        } },
      },
    }),
  ]);
  const courseRows = new Map(legacy.flatMap(topic => topic.courseSlug ? [[topic.courseSlug, topic] as const] : []));
  const chapterRows = new Map(legacy.flatMap(topic => topic.courseSlug ? [[topic.courseSlug + ":" + normalize(topic.chapterTitle), topic] as const] : []));
  const linkedLessons = new Set(legacy.flatMap(topic => topic.lessonId ? [topic.lessonId] : []));
  const authored = courses.flatMap(course => {
    const syllabus = courseSyllabus(course.slug);
    if (!syllabus || !access.syllabuses.includes(syllabus)) return [];
    const olderCourse = courseRows.get(course.slug);
    const courseTitle = olderCourse?.courseTitle ?? course.texts[0]?.title ?? course.slug;
    return course.topics.flatMap(chapter => {
      const chapterTitle = chapter.texts[0]?.title ?? chapter.slug;
      const olderChapter = chapterRows.get(course.slug + ":" + normalize(chapterTitle));
      return chapter.lessons.filter(lesson => !linkedLessons.has(lesson.id)).map(lesson => ({
        id: "arena_" + lesson.id, syllabus, courseKey: olderCourse?.courseKey ?? course.slug, courseTitle,
        chapterKey: olderChapter?.chapterKey ?? chapter.slug, chapterTitle: olderChapter?.chapterTitle ?? chapterTitle,
        chapterOrder: olderChapter?.chapterOrder ?? chapter.position, title: lesson.versions[0]?.texts[0]?.title ?? chapterTitle,
        position: lesson.position, courseSlug: course.slug, lessonId: lesson.id,
      } satisfies ListedTopic));
    });
  });
  return [...legacy, ...authored].sort((left, right) => paperOrder.compare(left.courseKey, right.courseKey) ||
    left.chapterOrder - right.chapterOrder || left.position - right.position || paperOrder.compare(left.title, right.title));
}

export async function examArchiveOverview(access: ExamArchiveAccess) {
  const [preferences, courses, topics, papers] = await Promise.all([
    examArchivePreferences(access),
    db().courseFollow.findMany({ where: { userId: access.actor.id }, select: { course: { select: { slug: true } } } }),
    archiveTopics(access),
    db().examArchivePaper.findMany({
      where: { syllabus: { in: access.syllabuses }, questions: { some: { question: { syllabus: { in: access.syllabuses } } } } },
      select: {
        id: true, syllabus: true, year: true, session: true, paperCode: true, questions: {
          where: { question: { syllabus: { in: access.syllabuses } } },
          select: { number: true, question: { select: { marks: true, syllabus: true } } },
        },
      },
      orderBy: [{ year: "desc" }, { session: "asc" }, { paperCode: "asc" }],
    }),
  ]);
  await logExamArchiveAccess(access, "INDEX_READ", "index");
  return {
    admin: access.admin,
    followedCourseSlugs: courses.map(row => row.course.slug),
    preferences: {
      ...preferences,
      topicKey: topics.some(topic => topic.id === preferences.topicKey) ? preferences.topicKey : null,
      paperId: papers.some(paper => paper.id === preferences.paperId) ? preferences.paperId : null,
    },
    topics,
    papers: papers.flatMap(paper => {
      const questions = paper.questions.filter(row => row.question.syllabus === paper.syllabus);
      return questions.length ? [toPaperSummary(paper, questions)] : [];
    }),
  };
}

function referenceFor(paper: Pick<ExamPaper, "syllabus" | "session" | "year" | "paperCode">, number: string) {
  return paper.syllabus + " · " + paper.session + " " + paper.year + " · Paper " + paper.paperCode + " · Question " + number;
}

function questionSummary(access: ExamArchiveAccess, question: ExamArchiveQuestionMetadata, paper?: ExamPaper, number?: string) {
  return {
    id: question.id, marks: question.marks, questionType: question.questionType, difficulty: question.difficulty,
    number: number ?? "", hasContent: archiveContentRights(access, question).statement,
    sourceReference: paper && number ? referenceFor(paper, number) : null,
  };
}

export async function examArchivePaper(access: ExamArchiveAccess, rawId: string) {
  const id = examArchiveId(rawId);
  const paper = await db().examArchivePaper.findFirst({
    where: { id, syllabus: { in: access.syllabuses } },
    select: { ...paperSelect, questions: { select: { number: true, question: { select: questionSelect } } } },
  });
  ensure(paper, 404, "NOT_FOUND");
  const visible = paper.questions
    .filter(row => row.question.syllabus === paper.syllabus)
    .sort((left, right) => paperOrder.compare(left.number, right.number));
  ensure(visible.length, 404, "NOT_FOUND");
  await logExamArchiveAccess(access, "PAPER_READ", id);
  return {
    paper: {
      ...toPaperSummary(paper, visible), officialUrl: officialExamUrl(paper.officialUrl), markSchemeUrl: officialExamUrl(paper.markSchemeUrl),
    },
    questions: visible.map(({ number, question }) => questionSummary(access, question, paper, number)),
  };
}

const filterInteger = (lowest: number, highest: number) => z.coerce.number().int().min(lowest).max(highest).optional();
const archiveTopicFilters = z.object({
  paper: z.string().regex(/^[a-zA-Z0-9_.:-]{1,191}$/).optional(),
  session: z.string().max(40).optional(),
  year: filterInteger(1900, 2100),
  difficulty: filterInteger(1, 5),
  minMarks: filterInteger(0, 250),
  maxMarks: filterInteger(0, 250),
  type: z.string().max(30).optional(),
  page: filterInteger(1, 10000),
  originalPage: filterInteger(1, 10000),
}).strict();

export async function examArchiveTopic(access: ExamArchiveAccess, rawId: string, input: unknown = {}) {
  const id = examArchiveId(rawId);
  const filters = archiveTopicFilters.parse(input);
  ensure(filters.minMarks === undefined || filters.maxMarks === undefined || filters.minMarks <= filters.maxMarks, 400, "INVALID_MARKS_RANGE");
  let topic = await db().examArchiveTopic.findFirst({ where: { id, syllabus: { in: access.syllabuses } }, select: topicSelect });
  if (!topic && id.startsWith("arena_")) topic = (await archiveTopics(access)).find(row => row.id === id) ?? null;
  ensure(topic, 404, "NOT_FOUND");
  const pageSize = 30;
  const page = filters.page ?? 1;
  const paperFilter: Prisma.ExamArchivePaperWhereInput = {
    syllabus: topic.syllabus,
    ...(filters.paper ? { OR: [{ id: filters.paper }, { paperCode: filters.paper }] } : {}),
    year: filters.year,
    session: filters.session,
  };
  const where: Prisma.ExamArchiveQuestionWhereInput = {
    syllabus: topic.syllabus, topics: { some: { topicId: id } }, papers: { some: { paper: paperFilter } },
    difficulty: filters.difficulty, questionType: filters.type,
    ...(filters.minMarks !== undefined || filters.maxMarks !== undefined
      ? { marks: { gte: filters.minMarks, lte: filters.maxMarks } } : {}),
  };
  const [total, questions, originalQuestions] = await Promise.all([
    db().examArchiveQuestion.count({ where }),
    db().examArchiveQuestion.findMany({
      where, select: {
        ...questionSelect,
        papers: { where: { paper: paperFilter }, select: { number: true, paper: { select: paperSelect } }, orderBy: { paper: { year: "desc" } }, take: 1 },
      }, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize,
    }),
    examArchiveOriginals(topic, filters.originalPage),
  ]);
  await logExamArchiveAccess(access, "TOPIC_READ", id);
  return {
    topic, total, page, pageSize, originalQuestions,
    questions: questions.map(question => questionSummary(access, question, question.papers[0]?.paper, question.papers[0]?.number)),
  };
}

export async function lookupExamArchiveQuestion(access: ExamArchiveAccess, rawId: string) {
  const id = examArchiveId(rawId);
  const question = await db().examArchiveQuestion.findFirst({
    where: { id, syllabus: { in: access.syllabuses } },
    select: {
      ...questionSelect,
      topics: { select: { topic: { select: { id: true, title: true, syllabus: true } } } },
      papers: { select: { number: true, paper: { select: paperSelect } }, orderBy: { paper: { year: "desc" } } },
      sources: { select: { printedPart: true } },
    },
  });
  ensure(question, 404, "NOT_FOUND");
  const papers = question.papers.filter(row => row.paper.syllabus === question.syllabus);
  ensure(papers.length, 404, "NOT_FOUND");
  return {
    question, rights: archiveContentRights(access, question),
    summary: questionSummary(access, question, papers[0]?.paper, papers[0]?.number),
    topics: question.topics.filter(row => row.topic.syllabus === question.syllabus).map(({ topic }) => ({ id: topic.id, title: topic.title })),
    papers: papers.map(({ paper, number }) => ({
      id: paper.id, syllabus: paper.syllabus, year: paper.year, session: paper.session, paperCode: paper.paperCode, number,
      officialUrl: officialExamUrl(paper.officialUrl), markSchemeUrl: officialExamUrl(paper.markSchemeUrl),
    })),
  };
}
