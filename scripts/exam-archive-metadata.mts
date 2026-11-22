import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const archiveSyllabuses = {
  "0580": "cambridge-igcse-mathematics-0580",
  "0606": "cambridge-igcse-mathematics-additional-0606",
  "9709": "cambridge-international-as-and-a-level-mathematics-9709",
  "9231": "cambridge-international-as-and-a-level-mathematics-further-9231",
} as const;

type Syllabus = keyof typeof archiveSyllabuses;

export const archiveCourses = [
  ["0580 IGCSE Mathematics (Extended)", "0580", "maths4u-0580"],
  ["0606 Additional Mathematics", "0606", "maths4u-0606"],
  ["9709 Pure Mathematics 1", "9709", "maths4u-9709-p1"],
  ["9709 Pure Mathematics 2", "9709", "maths4u-9709-p2"],
  ["9709 Pure Mathematics 3", "9709", "maths4u-9709-p3"],
  ["9709 Mechanics", "9709", "maths4u-9709-m1"],
  ["9709 Statistics 1", "9709", "maths4u-9709-s1"],
  ["9709 Statistics 2", "9709", "maths4u-9709-s2"],
  ["9231 FP1 Further Pure Mathematics 1", "9231", "maths4u-9231-fp1"],
  ["9231 FP2 Further Pure Mathematics 2", "9231", "maths4u-9231-fp2"],
  ["9231 Further Mechanics", "9231", "maths4u-9231-mechanics"],
  ["9231 Further Probability and Statistics", "9231", "maths4u-9231-statistics"],
] as const;

const title = z.string().trim().min(1).max(191);
const id = z.number().int().positive();
const sourceRecordId = z.union([id, z.string().regex(/^[1-9][0-9]*$/).transform(Number).pipe(id)]);
const order = z.number().int().nonnegative();
const marks = z.number().int().nonnegative().max(500).nullish();
const column = z.string().trim().max(40).nullish();

const examMetadata = z.object({
  syllabus: z.string(), year: z.number().int().min(1900).max(2100), examSession: z.string(),
  paper: z.string(), questionNumber: z.string(), paperGroup: column,
});

const extraReference = z.object({
  id, problem_id: id, syllabus: z.string(), exam_year: z.number().int().min(1900).max(2100),
  exam_session: z.string(), component: z.string(), question_no: z.string(), paper_group: column, marks,
});

// Zod discards keys outside this metadata allowlist, including every content and file field.
const chapterExport = z.object({
  course: z.object({ title }),
  chapter: z.object({ id: id.optional(), number: order, title, sort_order: order.optional() }),
  lessons: z.array(z.object({
    id: id.optional(), title, sort_order: order.optional(),
    questions: z.array(z.object({ id: sourceRecordId, exam: examMetadata, marks, exam_sources: z.array(extraReference).optional() })),
  })),
});

export function normalizedTitle(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function metadataHash(val: unknown) {
  return createHash("sha256").update(JSON.stringify(val)).digest("hex");
}

function stableKey(prefix: string, ...values: (string | number)[]) {
  return prefix + "_" + metadataHash(values).slice(0, 32);
}

const normalizedSessions: Record<string, string> = {
  march: "March", mar: "March", m: "March",
  june: "June", jun: "June", s: "June",
  november: "November", nov: "November", w: "November",
};

export function archiveReference(syllabus: Syllabus, year: number, rawSession: string, paperCode: string, label: string) {
  const session = normalizedSessions[rawSession.toLowerCase().trim()];
  const printed = label.trim();
  const parsed = /^0*([1-9][0-9]*)([A-Za-z]+)?$/.exec(printed);
  if (!session || !/^[1-9][0-9]?$/.test(paperCode) || !parsed) throw Error("Unsupported exam reference.");
  const choice = (syllabus === "9231" && /^[EO]$/.test(parsed[2] ?? "")) ? parsed[2] : "";
  return {
    syllabus, year, session, paperCode, number: parsed[1] + choice, printed,
    printedPart: choice ? null : parsed[2]?.toLowerCase() ?? null,
  };
}

type Reference = ReturnType<typeof archiveReference>;
type SourceReference = Reference & { rowId?: number; marks: number | null; paperGroup: string | null };
type SourceRow = { id: number; topicId: string; primary: SourceReference; extra: SourceReference[] };

export type TopicMetadata = {
  id: string; syllabus: Syllabus; courseKey: string; courseTitle: string; chapterKey: string;
  chapterTitle: string; chapterOrder: number; title: string; position: number;
  courseSlug: string | null; lessonId: string | null;
};

export type CuratedLesson = {
  id: string; courseSlug: string; chapterTitle: string; title: string;
};

export type LinkedVersion = {
  legacyId: string; taskVersionId: string; difficulty: number | null;
  syllabus: string | null; year: number | null; examSession: string | null;
  paper: string | null; questionNumber: string | null;
};

function paperKey(reference: Reference) {
  return stableKey("exam_paper", reference.syllabus, reference.year, reference.session, reference.paperCode);
}

function referenceKey(reference: Reference) {
  return paperKey(reference) + ":" + reference.number;
}

function questionKey(reference: Reference) {
  return stableKey("exam_question", referenceKey(reference));
}

function consensusMarks(rows: readonly SourceRow[]) {
  const completeMarks = rows
    .filter(row => row.primary.printedPart === null)
    .map(row => row.primary.marks)
    .filter((value): value is number => value !== null);
  // A question assembled from partial legacy rows has no certified full mark total.
  return new Set(completeMarks).size === 1 ? completeMarks[0] : null;
}

async function loadChapterExports(sourceRoot: string) {
  const sources = new Map<number, SourceRow>();
  const topics: TopicMetadata[] = [];
  for (const [folder, syllabus, courseKey] of archiveCourses) {
    const directory = join(sourceRoot, folder);
    const chapters = (await readdir(directory, { withFileTypes: true }))
      .filter(file => file.isFile() && /^\d{2} .+\.json$/.test(file.name))
      .map(file => file.name)
      .sort();
    if (!chapters.length) throw Error(`No chapter exports in ${folder}.`);
    for (const filename of chapters) {
      const raw = await readFile(join(directory, filename), "utf8");
      const { course, chapter, lessons } = chapterExport.parse(JSON.parse(raw.replace(/^\uFEFF/, "")));
      const chapterKey = stableKey("exam_chapter", courseKey, chapter.id ?? chapter.number);
      for (const [index, lesson] of lessons.entries()) {
        if (!lesson.questions.length) continue;
        const topicId = stableKey("exam_topic", chapterKey, lesson.id ?? index + 1);
        topics.push({
          id: topicId, syllabus, courseKey, courseTitle: course.title, chapterKey,
          chapterTitle: chapter.title, chapterOrder: chapter.sort_order ?? chapter.number,
          title: lesson.title, position: lesson.sort_order ?? index + 1,
          courseSlug: null, lessonId: null,
        });
        for (const row of lesson.questions) {
          const paper = row.exam;
          if (paper.syllabus !== syllabus || sources.has(row.id)) throw Error(`Conflicting source ID ${row.id}.`);
          const primary = archiveReference(syllabus, paper.year, paper.examSession, paper.paper, paper.questionNumber);
          const extra = (row.exam_sources ?? []).map(reference => {
            if (reference.syllabus !== syllabus || reference.problem_id !== row.id) throw Error(`Misplaced source reference for ${row.id}.`);
            return {
              ...archiveReference(syllabus, reference.exam_year, reference.exam_session, reference.component, reference.question_no),
              rowId: reference.id, marks: reference.marks ?? null, paperGroup: reference.paper_group ?? null,
            };
          }).sort((a, b) => a.rowId - b.rowId);
          sources.set(row.id, {
            id: row.id, topicId,
            primary: { ...primary, marks: row.marks ?? null, paperGroup: paper.paperGroup ?? null }, extra,
          });
        }
      }
    }
  }
  return { topics, rows: [...sources.values()].sort((a, b) => a.id - b.id) };
}

function normalizedLegacyId(value: string) {
  return value.replace(/^problems:/, "");
}

function matchExistingVersion(rows: readonly SourceRow[], versions: ReadonlyMap<string, LinkedVersion[]>) {
  const matches = rows.flatMap(row => (versions.get(String(row.id)) ?? []).filter(version => {
    if (version.syllabus !== row.primary.syllabus || version.year !== row.primary.year || !version.examSession || !version.paper || !version.questionNumber) return false;
    try {
      const reference = archiveReference(row.primary.syllabus, version.year, version.examSession, version.paper, version.questionNumber);
      return referenceKey(reference) === referenceKey(row.primary) && reference.printedPart === row.primary.printedPart;
    } catch {
      return false;
    }
  }));
  const versionsById = new Map(matches.map(match => [match.taskVersionId, match]));
  return versionsById.size === 1 ? matches[0] : undefined;
}

export async function examArchivePlan(sourceRoot: string, suite: {
  courseSlugs?: readonly string[]; curatedLessons?: readonly CuratedLesson[]; linkedVersions?: readonly LinkedVersion[];
} = {}) {
  const { topics, rows } = await loadChapterExports(sourceRoot);
  const papers = new Map<string, { id: string; syllabus: Syllabus; year: number; session: string; paperCode: string; officialUrl: string }>();
  const paperQuestions = new Map<string, { paperId: string; number: string; questionId: string }>();
  const primaryGroups = new Map<string, SourceRow[]>();
  const referenceOwners = new Map<string, Set<string>>();
  const versionsByLegacyId = new Map<string, LinkedVersion[]>();
  for (const version of suite.linkedVersions ?? []) {
    const legacyId = normalizedLegacyId(version.legacyId);
    const versions = versionsByLegacyId.get(legacyId) ?? [];
    versions.push(version);
    versionsByLegacyId.set(legacyId, versions);
  }

  for (const row of rows) {
    const primaryKey = questionKey(row.primary);
    const group = primaryGroups.get(primaryKey) ?? [];
    group.push(row);
    primaryGroups.set(primaryKey, group);
    for (const reference of [row.primary, ...row.extra]) {
      const key = referenceKey(reference);
      const owners = referenceOwners.get(key) ?? new Set<string>();
      owners.add(primaryKey);
      referenceOwners.set(key, owners);
    }
  }

  function addReference(reference: Reference, questionId: string) {
    const id = paperKey(reference);
    const key = referenceKey(reference);
    if (!papers.has(id)) {
      papers.set(id, {
        id, syllabus: reference.syllabus, year: reference.year, session: reference.session, paperCode: reference.paperCode,
        officialUrl: "https://www.cambridgeinternational.org/programmes-and-qualifications/" + archiveSyllabuses[reference.syllabus] + "/past-papers/",
      });
    }
    paperQuestions.set(key, { paperId: id, number: reference.number, questionId });
  }

  const questionTopics: { questionId: string; topicId: string }[] = [];
  const sources: { sourceKey: string; questionId: string; printedPart: string | null; references: SourceReference[] }[] = [];
  const aliasConflicts = new Set<string>();
  const questions = [...primaryGroups.entries()].map(([questionId, group]) => {
    const primary = group[0].primary;
    const linked = matchExistingVersion(group, versionsByLegacyId);
    addReference(primary, questionId);
    for (const topicId of new Set(group.map(row => row.topicId))) questionTopics.push({ questionId, topicId });
    for (const row of group) {
      const references = [row.primary, ...row.extra];
      sources.push({ sourceKey: "maths4u:problems:" + row.id, questionId, printedPart: row.primary.printedPart, references });
      for (const alias of row.extra) {
        const key = referenceKey(alias);
        if (referenceOwners.get(key)?.size === 1) addReference(alias, questionId);
        else aliasConflicts.add(key);
      }
    }
    return {
      id: questionId, syllabus: primary.syllabus, marks: consensusMarks(group),
      difficulty: linked?.difficulty ?? null, taskVersionId: linked?.taskVersionId ?? null,
    };
  });

  const courseSlugs = new Set(suite.courseSlugs);
  const matchingLessons = new Map<string, string[]>();
  function lessonKey(course: string, chapter: string, topic: string) {
    return JSON.stringify([course, normalizedTitle(chapter), normalizedTitle(topic)]);
  }
  for (const lesson of suite.curatedLessons ?? []) {
    const key = lessonKey(lesson.courseSlug, lesson.chapterTitle, lesson.title);
    const matches = matchingLessons.get(key) ?? [];
    matches.push(lesson.id);
    matchingLessons.set(key, matches);
  }
  for (const topic of topics) {
    if (!courseSlugs.has(topic.courseKey)) continue;
    topic.courseSlug = topic.courseKey;
    const matches = matchingLessons.get(lessonKey(topic.courseKey, topic.chapterTitle, topic.title));
    if (matches?.length === 1) topic.lessonId = matches[0];
  }

  const archive = {
    papers: [...papers.values()], questions, paperQuestions: [...paperQuestions.values()],
    topics, questionTopics, sources,
  };
  const counts = Object.fromEntries(Object.keys(archiveSyllabuses).map(syllabus => {
    const paperIds = new Set(archive.papers.filter(paper => paper.syllabus === syllabus).map(paper => paper.id));
    const entries = archive.questions.filter(question => question.syllabus === syllabus);
    const questionIds = new Set(entries.map(entry => entry.id));
    return [syllabus, {
      sourceRows: sources.filter(source => questionIds.has(source.questionId)).length,
      questionEntries: entries.length,
      papers: paperIds.size,
      paperPlacements: archive.paperQuestions.filter(placement => paperIds.has(placement.paperId)).length,
      linkedVersions: entries.filter(entry => entry.taskVersionId).length,
      topics: topics.filter(topic => topic.syllabus === syllabus).length,
      lessonsMatched: topics.filter(topic => topic.syllabus === syllabus && topic.lessonId).length,
    }];
  }));
  return { archive, hash: metadataHash(archive), counts, heldAliasPlacements: aliasConflicts.size };
}
