import { readFile } from "node:fs/promises";
import { parseArgs, isDeepStrictEqual } from "node:util";
import { parse } from "dotenv";
import { ZodError } from "zod";
import { databaseConfig } from "../src/lib/database-url";
import { db } from "../src/lib/prisma";
import { examArchiveInternalPlan } from "./exam-archive-internal-plan.mjs";

type Plan = Awaited<ReturnType<typeof examArchiveInternalPlan>>;
type ArchiveDb = ReturnType<typeof db>;

async function isolatedDatabase(envFile: string) {
  const env = parse(await readFile(envFile));
  for (const key of ["MATHS4U_ENV", "MATHS4U_DATABASE_URL", "MATHS4U_DATABASE_NAME"]) {
    if (!env[key]) throw new Error("The isolated test environment must explicitly set all database keys.");
    process.env[key] = env[key];
  }
  const target = databaseConfig();
  if (env.MATHS4U_ENV !== "test" || target.host !== "127.0.0.1" || target.port !== 33317
      || !/^maths4u_test_[a-zA-Z0-9_]+$/.test(target.database)) {
    throw new Error("Full statement import requires isolated MariaDB on 127.0.0.1:33317.");
  }
  return db();
}

async function inspectOrApply(client: ArchiveDb, plan: Plan, apply: boolean) {
  return client.$transaction(async tx => {
    const [sources, questions, material] = await Promise.all([
      tx.examArchiveSource.findMany({ select: { sourceKey: true, questionId: true, printedPart: true } }),
      tx.examArchiveQuestion.findMany({ select: { id: true, syllabus: true } }),
      tx.examArchiveInternalContent.findMany(),
    ]);
    const sourceById = new Map(sources.map(source => [source.sourceKey, source]));
    const syllabusById = new Map(questions.map(question => [question.id, question.syllabus]));
    const currentById = new Map(material.map(row => [row.questionId, row]));
    for (const question of plan.questions) {
      if (syllabusById.get(question.id) !== question.syllabus) throw new Error("An archive question is missing or unmatched.");
    }
    for (const expected of plan.sources) {
      const source = sourceById.get(expected.sourceKey);
      if (!source || source.questionId !== expected.questionId || source.printedPart !== expected.printedPart) {
        throw new Error("An archive provenance reference is missing or unmatched.");
      }
    }
    const inserts = plan.rows.filter(row => {
      const current = currentById.get(row.questionId);
      if (!current) return true;
      if (!isDeepStrictEqual(current, row)) throw new Error("Existing internal content differs. No rows were overwritten.");
      return false;
    });
    if (!apply) return { existing: plan.rows.length - inserts.length, pending: inserts.length, inserted: 0 };
    let inserted = 0;
    for (let position = 0; position < inserts.length; position += 100) {
      const data = inserts.slice(position, position + 100);
      inserted += (await tx.examArchiveInternalContent.createMany({ data })).count;
    }
    if (inserted !== inserts.length) throw new Error("Statement insert count mismatch.");
    return { existing: plan.rows.length - inserts.length, pending: 0, inserted };
  }, { timeout: 120_000 });
}

const usage = "Usage: tsx scripts/exam-archive-internal-import.mts --source DIRECTORY [--legacy-resources PRIVATE_JSON] [--env-file TEST_ENV [--apply DRY_RUN_HASH]]";
const controlledErrors = new Set([
  usage,
  "The isolated test environment must explicitly set all database keys.",
  "Full statement import requires isolated MariaDB on 127.0.0.1:33317.",
  "An archive question is missing or unmatched.",
  "An archive provenance reference is missing or unmatched.",
  "Existing internal content differs. No rows were overwritten.",
  "Statement insert count mismatch.",
  "Statement plan changed. Run a new dry run.",
  "An archive question lacks a full statement.",
  "Unexpected or duplicate archive source.",
  "Archive source exam reference changed.",
  "Incomplete statement export.",
  "Legacy media map contains unrecognised entries.",
]);

async function main() {
  const { values } = parseArgs({
    options: { source: { type: "string" }, "env-file": { type: "string" }, "legacy-resources": { type: "string" }, apply: { type: "string" } },
  });
  if (!values.source || (values.apply && (!values["env-file"] || !/^[a-f0-9]{64}$/.test(values.apply)))) throw new Error(usage);
  const client = values["env-file"] ? await isolatedDatabase(values["env-file"]) : undefined;
  try {
    const plan = await examArchiveInternalPlan(values.source, values["legacy-resources"]);
    if (values.apply && values.apply !== plan.hash) throw new Error("Statement plan changed. Run a new dry run.");
    const changes = client ? await inspectOrApply(client, plan, !!values.apply) : undefined;
    console.log(JSON.stringify({
      mode: values.apply ? "applied" : "dry-run", databaseLinked: !!client,
      hash: plan.hash, bytes: plan.bytes, ...plan.stats, ...(changes && { changes }),
    }, null, 2));
  } finally {
    await client?.$disconnect();
  }
}

await main().catch(error => {
  // Prisma and parser diagnostics can include the private source payload.
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    console.error("Invalid source metadata at " + issue.path.join(".") + " (" + issue.code + ").");
  } else if (error instanceof Error && controlledErrors.has(error.message)) console.error(error.message);
  else console.error("Full statement import failed. Review the source and isolated database configuration.");
  process.exitCode = 1;
});
