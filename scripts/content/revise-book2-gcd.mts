import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import type { Prisma } from "../../src/generated/prisma/client";
import { appendTaskRevision, versionContent } from "../../src/lib/content-revisions";
import { renderContent, versionInclude } from "../../src/lib/content";
import { databaseConfig } from "../../src/lib/database-url";
import { pilotId } from "../../src/lib/pilot-schema";
import { db } from "../../src/lib/prisma";
import { transaction } from "../../src/lib/security";
import { lessonEdits, reviseBook2Text, taskEdits } from "../../content/original/book2-gcd-revision";

const courseSlug = "olymp-number-theory2";
const lessonId = pilotId("lesson", "olymp", "book2-module1-advanced-gcd-problems");
const taskSource = "Olymp / Book 2. Olympiad Number Theory Methods";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function requireCondition(test: unknown, code: string): asserts test {
  if (!test) throw new Error(code);
}

function verifyFormula(html: string) {
  requireCondition(!renderContent(html).includes('class="katex-error"'), "BOOK2_REVISION_INVALID_FORMULA");
}

async function plan(tx: Prisma.TransactionClient) {
  const lesson = await tx.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { topic: { include: { course: true } }, versions: { take: 1, orderBy: { number: "desc" }, include: { texts: { orderBy: { locale: "asc" } } } } },
  });
  const course = lesson.topic.course;
  const previous = lesson.versions[0];
  requireCondition(!lesson.archivedAt && course.slug === courseSlug && course.published && !course.archivedAt && !course.featureKey
    && previous?.texts.length === 2, "BOOK2_REVISION_LESSON_CONFLICT");
  const texts = previous.texts.map(({ locale, title, body, examples }) => {
    const edited = lessonEdits[locale].reduce(reviseBook2Text, body);
    verifyFormula(edited);
    return { locale, title, body: edited, examples };
  });
  const lessonChanged = previous.texts.some((text, index) => text.body !== texts[index].body);

  const imported = await tx.importRecord.findMany({
    where: { sourceProject: "olymp", legacyId: { in: taskEdits.map(edit => edit.legacyId) } },
    include: { task: { include: { lessons: { select: { lessonId: true } }, versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } } },
  });
  requireCondition(imported.length === taskEdits.length, "BOOK2_REVISION_IMPORT_CONFLICT");
  const tasks = taskEdits.map(edit => {
    const task = imported.find(row => row.legacyId === edit.legacyId)!.task;
    const version = task.versions[0];
    requireCondition(task.origin === "ORIGINAL" && task.originManual && task.visibility === "PUBLIC"
      && !task.archivedAt && !task.examArchivedAt && !task.featureKey && task.lessons.some(l => l.lessonId === lessonId)
      && version?.questionNumber === edit.questionNumber && version.source?.name === taskSource
      && !version.examBoard && version.texts.length === 2
      && version.parts.length === 1 && version.parts[0].kind === "MANUAL", "BOOK2_REVISION_TASK_CONFLICT");
    let changed = false;
    const taskTexts = version.texts.map(text => {
      const next = { ...text };
      const fields = edit[text.locale];
      for (const field of ["statement", "hint", "solution"] as const) {
        const fragment = fields[field];
        if (!fragment) continue;
        next[field] = reviseBook2Text(text[field], fragment);
        verifyFormula(next[field]);
        changed ||= next[field] !== text[field];
      }
      return next;
    });
    return { questionNumber: edit.questionNumber, version, taskTexts, changed };
  });

  const fingerprint = digest({
    lesson: [previous.id, previous.number, previous.texts, texts],
    tasks: tasks.map(({ version, taskTexts }) => [version.id, version.number, versionContent(version), versionContent({ ...version, texts: taskTexts })]),
  });
  return { fingerprint, lesson: { id: lessonId, previous, texts, changed: lessonChanged }, tasks };
}

type Plan = Awaited<ReturnType<typeof plan>>;

function summary(revision: Plan) {
  return {
    fingerprint: revision.fingerprint,
    lesson: { id: lessonId, version: revision.lesson.previous.number, append: revision.lesson.changed },
    tasks: revision.tasks.map(({ questionNumber, version, changed }) => ({ questionNumber, id: version.taskId, version: version.number, append: changed })),
  };
}

async function apply(tx: Prisma.TransactionClient, fingerprint: string) {
  const before = await plan(tx);
  await tx.$queryRaw`SELECT id FROM Lesson WHERE id=${lessonId} FOR UPDATE`;
  const ids = before.tasks.map(item => item.version.taskId).sort();
  for (const id of ids) await tx.$queryRaw`SELECT id FROM Task WHERE id=${id} FOR UPDATE`;
  const revision = await plan(tx);
  requireCondition(revision.fingerprint === fingerprint, "BOOK2_REVISION_STALE_DRY_RUN");
  if (revision.lesson.changed) {
    await tx.lessonVersion.create({ data: { lessonId, number: revision.lesson.previous.number + 1, texts: { create: revision.lesson.texts } } });
  }
  for (const item of revision.tasks) {
    if (item.changed) await appendTaskRevision(tx, { ...item.version, texts: item.taskTexts }, false);
  }
  const repeated = await plan(tx);
  requireCondition(!repeated.lesson.changed && repeated.tasks.every(item => !item.changed), "BOOK2_REVISION_NOT_IDEMPOTENT");
  return { before: summary(revision), after: summary(repeated) };
}

let connected = false;
async function main() {
  const [, , settings, mode, ...rest] = process.argv;
  requireCondition(settings && !rest.length && (!mode || /^--apply=[a-f0-9]{64}$/.test(mode)), "BOOK2_REVISION_USAGE");
  const env = parse(await readFile(settings));
  for (const key of ["MATHS4U_ENV", "MATHS4U_DATABASE_URL", "MATHS4U_DATABASE_NAME"]) {
    process.env[key] = env[key] ?? "";
  }
  const config = databaseConfig();
  requireCondition(process.env.MATHS4U_ENV === "test" && config.host === "127.0.0.1" && /^maths4u_test_\w+$/.test(config.database), "BOOK2_REVISION_LOCAL_TEST_ONLY");
  connected = true;
  const result = mode ? await transaction(tx => apply(tx, mode.slice("--apply=".length))) : summary(await transaction(plan));
  console.log(JSON.stringify(result, null, 2));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error && /^BOOK2_REVISION_[A-Z_]+$/.test(error.message) ? error.message : "BOOK2_REVISION_FAILED";
  console.error(message);
  process.exitCode = 1;
} finally {
  if (connected) await db().$disconnect();
}
