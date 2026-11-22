import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { parse } from "dotenv";
import { databaseConfig } from "../src/lib/database-url";
import { db } from "../src/lib/prisma";
import { examArchivePlan } from "./exam-archive-metadata.mjs";

type Archive = Awaited<ReturnType<typeof examArchivePlan>>["archive"];
type ArchiveDb = ReturnType<typeof db>;

async function isolatedDatabase(envFile: string) {
  const env = parse(await readFile(envFile));
  for (const key of ["MATHS4U_ENV", "MATHS4U_DATABASE_URL", "MATHS4U_DATABASE_NAME"]) {
    if (!env[key]) throw Error("The isolated test environment must explicitly set all database keys.");
    process.env[key] = env[key];
  }
  const target = databaseConfig();
  if (env.MATHS4U_ENV !== "test" || target.host !== "127.0.0.1" || target.port !== 33317
    || !/^maths4u_test_[a-zA-Z0-9_]+$/.test(target.database)) {
    throw Error("Exam archive import requires isolated MariaDB on 127.0.0.1:33317.");
  }
  return db();
}

async function readExistingMetadata(client: ArchiveDb) {
  const [records, courses] = await Promise.all([
    client.importRecord.findMany({
      where: {
        sourceProject: "maths4u",
        task: { origin: "CAMBRIDGE_EXAM", examArchivedAt: { not: null } },
      },
      select: {
        legacyId: true,
        task: {
          select: {
            versions: {
              take: 1, orderBy: { number: "desc" },
              select: {
                id: true, syllabus: true, year: true, examSession: true, paper: true,
                questionNumber: true, difficulty: true, difficultyKnown: true,
              },
            },
          },
        },
      },
    }),
    client.course.findMany({
      where: { published: true, archivedAt: null },
      select: {
        slug: true,
        topics: {
          select: {
            texts: { where: { locale: "en" }, select: { title: true } },
            lessons: {
              where: {
                archivedAt: null,
                tasks: { some: { task: { origin: "ORIGINAL", visibility: "PUBLIC", archivedAt: null, examArchivedAt: null } } },
              },
              select: {
                id: true,
                versions: {
                  take: 1, orderBy: { number: "desc" },
                  select: { texts: { where: { locale: "en" }, select: { title: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    courseSlugs: courses.map(course => course.slug),
    linkedVersions: records.flatMap(({ legacyId, task }) => task.versions.map(version => ({
      legacyId, taskVersionId: version.id, syllabus: version.syllabus, year: version.year,
      examSession: version.examSession, paper: version.paper, questionNumber: version.questionNumber,
      difficulty: version.difficultyKnown ? version.difficulty : null,
    }))),
    curatedLessons: courses.flatMap(course => course.topics.flatMap(topic => topic.texts.flatMap(chapter =>
      topic.lessons.flatMap(lesson => (lesson.versions[0]?.texts ?? []).map(text => ({
        id: lesson.id, courseSlug: course.slug, chapterTitle: chapter.title, title: text.title,
      }))),
    ))),
  };
}

async function insertBatches<T>(values: T[], insert: (chunk: T[]) => Promise<{ count: number }>) {
  let count = 0;
  for (let offset = 0; offset < values.length; offset += 250) {
    count += (await insert(values.slice(offset, offset + 250))).count;
  }
  return count;
}

async function applyArchive(client: ArchiveDb, archive: Archive) {
  return client.$transaction(async tx => {
    const expectedPapers = new Map(archive.papers.map(row => [row.id, row]));
    const expectedPlacements = new Map(archive.paperQuestions.map(row => [row.paperId + ":" + row.number, row.questionId]));
    const expectedSources = new Map(archive.sources.map(row => [row.sourceKey, row.questionId]));

    const draftWithoutVersion = {
      taskVersionId: null, approvalReference: null,
      studentApproved: false, statementAllowed: false, solutionAllowed: false, assetsAllowed: false, markSchemeAllowed: false,
    } as const;
    const linkedVersions = new Map(archive.questions.filter(row => row.taskVersionId !== null).map(row => [row.id, row.taskVersionId!]));
    let linkedExistingQuestions = 0;
    const existingDraftQuestions = await tx.examArchiveQuestion.findMany({ where: draftWithoutVersion, select: { id: true } });
    for (const question of existingDraftQuestions) {
      const taskVersionId = linkedVersions.get(question.id);
      if (!taskVersionId) continue;
      linkedExistingQuestions += (await tx.examArchiveQuestion.updateMany({
        where: { id: question.id, ...draftWithoutVersion }, data: { taskVersionId },
      })).count;
    }

    const changes = {
      papers: await insertBatches(archive.papers, data => tx.examArchivePaper.createMany({ data, skipDuplicates: true })),
      questions: await insertBatches(archive.questions, data => tx.examArchiveQuestion.createMany({ data, skipDuplicates: true })),
      topics: await insertBatches(archive.topics, data => tx.examArchiveTopic.createMany({ data, skipDuplicates: true })),
      paperPlacements: await insertBatches(archive.paperQuestions, data => tx.examArchivePaperQuestion.createMany({ data, skipDuplicates: true })),
      topicLinks: await insertBatches(archive.questionTopics, data => tx.examArchiveQuestionTopic.createMany({ data, skipDuplicates: true })),
      sources: await insertBatches(archive.sources, data => tx.examArchiveSource.createMany({ data, skipDuplicates: true })),
    };

    const persistedPapers = await tx.examArchivePaper.findMany({ select: { id: true, syllabus: true, year: true, session: true, paperCode: true } });
    const persistedPlacements = await tx.examArchivePaperQuestion.findMany({ select: { paperId: true, number: true, questionId: true } });
    const persistedSources = await tx.examArchiveSource.findMany({ select: { sourceKey: true, questionId: true } });
    for (const row of persistedPapers) {
      const planned = expectedPapers.get(row.id);
      if (!planned) continue;
      if (planned.syllabus !== row.syllabus || planned.year !== row.year || planned.session !== row.session
        || planned.paperCode !== row.paperCode) throw Error("Conflicting archive paper identity.");
      expectedPapers.delete(row.id);
    }
    for (const row of persistedPlacements) {
      const key = row.paperId + ":" + row.number;
      const planned = expectedPlacements.get(key);
      if (!planned) continue;
      if (row.questionId !== planned) throw Error("Conflicting archive paper placement.");
      expectedPlacements.delete(key);
    }
    for (const row of persistedSources) {
      const planned = expectedSources.get(row.sourceKey);
      if (!planned) continue;
      if (row.questionId !== planned) throw Error("Conflicting archive source identity.");
      expectedSources.delete(row.sourceKey);
    }
    if (expectedPapers.size || expectedPlacements.size || expectedSources.size) throw Error("Incomplete archive import graph.");
    return { ...changes, linkedExistingQuestions };
  }, { timeout: 90_000 });
}

async function main() {
  const { values } = parseArgs({
    options: { source: { type: "string" }, "env-file": { type: "string" }, apply: { type: "string" } },
  });
  if (!values.source || (values.apply && (!values["env-file"] || !/^[a-f0-9]{64}$/.test(values.apply)))) {
    throw Error("Usage: tsx scripts/exam-archive-import.mts --source DIRECTORY [--env-file TEST_ENV [--apply DRY_RUN_HASH]]");
  }

  const client = values["env-file"] ? await isolatedDatabase(values["env-file"]) : undefined;
  try {
    const plan = await examArchivePlan(values.source, client ? await readExistingMetadata(client) : {});
    if (client && values.apply && values.apply !== plan.hash) throw Error("Archive plan changed. Run a new dry run.");
    const created = client && values.apply ? await applyArchive(client, plan.archive) : undefined;
    console.log(JSON.stringify({
      mode: created ? "applied" : "dry-run",
      databaseLinked: Boolean(client),
      hash: plan.hash,
      counts: plan.counts,
      heldAliasPlacements: plan.heldAliasPlacements,
      ...(created && { created }),
    }, null, 2));
  } finally {
    await client?.$disconnect();
  }
}

await main().catch(error => {
  console.error(error instanceof Error ? error.message : "Exam archive import failed.");
  process.exitCode = 1;
});
