import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/prisma";
import { importPilot, readPilot, requirePilotDatabase } from "../scripts/pilot/import";
import { previewPilot } from "../scripts/pilot/preview";
import { hashPassword } from "../src/lib/password";
import { digest, userSelect } from "../src/lib/security";
import { courses } from "../src/lib/courses";
import { download } from "../src/lib/files";
import { publicVersion, versionInclude, renderContent } from "../src/lib/content";
import { assetUrl, formulaAudit, mathsRecords, olympRecords } from "../scripts/pilot/prepare.mjs";

test("pilot parser rejects changed shapes, unsafe assets and invalid TeX", () => {
  assert.throws(() => mathsRecords("<p>Login required</p>", []));
  assert.throws(() => olympRecords("<p>Unavailable</p>", "<p>Unavailable</p>"));
  for (const url of ["https://other.invalid/uploads/problems/a.png", "//other.invalid/a.png", "/uploads/problems/../secrets.png", "/uploads/problems/a.svg", "https://user:secret@maths4u.sbs/uploads/problems/a.png"]) assert.throws(() => assetUrl(url, "https://maths4u.sbs"));
  assert.equal(formulaAudit("<p>\\(\\frac{a}{b}\\)</p>").count, 1);
  assert.equal(formulaAudit("\\(\\badmacro{x}\\)").errors.length, 1);
  assert.equal(formulaAudit("\\(x").unpairedDelimiter, true);
  const old = process.env.MATHS4U_ENV;
  process.env.MATHS4U_ENV = "production";
  try { assert.throws(requirePilotDatabase); } finally { process.env.MATHS4U_ENV = old; }
});

test("real selected content preserves structure, images, versions and permissions", { timeout: 180000 }, async t => {
  requirePilotDatabase();
  const root = path.resolve(".local/content-pilot"), run = randomBytes(5).toString("hex");
  const { bundle } = await readPilot(root);
  const actor = await db().user.create({ data: { username: "pilot_admin_" + run, displayName: "Pilot reviewer", passwordHash: await hashPassword(randomBytes(30).toString("hex")), roles: { create: { role: "ADMIN" } }, profile: { create: { locale: "en" } } }, select: userSelect });
  const student = await db().user.create({ data: { username: "pilot_student_" + run, displayName: "Pilot student", passwordHash: await hashPassword(randomBytes(30).toString("hex")), roles: { create: { role: "STUDENT" } } }, select: userSelect });
  let result: Awaited<ReturnType<typeof importPilot>>;
  await t.test("first import stores 56 tasks, 76 translations, 37 files and ordered lessons", async () => {
    result = await importPilot(actor, root);
    assert.deepEqual([result.created, result.updated, result.skipped, result.filesCreated, result.lessonVersionsCreated], [56, 0, 0, 37, 2]);
    assert.equal(await db().taskText.count(), 76);
    assert.equal(await db().lessonTask.count(), 56);
    const list = await courses(actor, "en");
    assert.equal(list.length, 2);
    for (let i = 0; i < bundle.sections.length; i++) {
      const section = bundle.sections[i], imported = result.sections[i];
      const course = list.find(c => c.id === imported.courseId)!;
      const lesson = course.topics[0].lessons[0];
      assert.deepEqual(lesson.tasks!.map(t => t.id), imported.taskIds);
      assert.deepEqual(lesson.tasks!.map(t => t.position), section.records.map(r => r.position));
      for (let j = 0; j < section.records.length; j++) {
        const actual = await db().taskVersion.findFirstOrThrow({ where: { taskId: imported.taskIds[j] }, include: versionInclude });
        for (const original of section.records[j].material.texts) {
          const translated = actual.texts.find(t => t.locale === original.locale)!;
          for (const field of ["statement", "hint", "solution", "teacherNote"] as const) {
            assert.equal(translated[field], original[field]);
            assert.ok(!renderContent(translated[field]).includes('class="katex-error"'));
          }
        }
      }
    }
    for (const asset of bundle.assets) assert.equal(digest((await download(actor, "pilot_" + asset.key)).data), asset.sha256);
  });
  await t.test("repeating import creates no task, lesson version, file or account changes", async () => {
    const before = await db().user.findUniqueOrThrow({ where: { id: actor.id }, include: { roles: true } });
    const repeated = await importPilot(actor, root);
    assert.deepEqual([repeated.created, repeated.updated, repeated.skipped, repeated.filesCreated, repeated.lessonVersionsCreated], [0, 0, 56, 0, 0]);
    assert.equal(await db().taskVersion.count(), 56); assert.equal(await db().lessonVersion.count(), 2); assert.equal(await db().storedFile.count(), 37);
    assert.deepEqual(await db().user.findUniqueOrThrow({ where: { id: actor.id }, include: { roles: true } }), before);
  });
  await t.test("private course and mark-scheme images remain private, public statement is not duplicated", async () => {
    assert.equal((await courses(null, "en")).length, 0); assert.equal((await courses(student, "en")).length, 0);
    const statement = bundle.assets.find(a => a.role === "STATEMENT")!, solution = bundle.assets.find(a => a.role === "SOLUTION")!;
    await assert.rejects(() => download(null, "pilot_" + statement.key));
    await assert.rejects(() => download(student, "pilot_" + solution.key));
    await assert.rejects(() => importPilot(student, root));
    const record = await db().importRecord.findUniqueOrThrow({ where: { sourceProject_legacyId: { sourceProject: statement.project, legacyId: statement.legacyId } } });
    await db().task.update({ where: { id: record.taskId }, data: { visibility: "PUBLIC" } });
    assert.equal(digest((await download(null, "pilot_" + statement.key)).data), statement.sha256);
    await assert.rejects(() => download(null, "pilot_" + solution.key));
    const version = await db().taskVersion.findFirstOrThrow({ where: { taskId: record.taskId }, include: versionInclude });
    const dto = publicVersion(version, "en");
    assert.ok(dto.statement.includes("/api/files/pilot_" + statement.key));
    assert.ok(!dto.assets.some(a => a.id === "pilot_" + statement.key));
    assert.equal(dto.solution, undefined);
    await db().task.update({ where: { id: record.taskId }, data: { visibility: "PRIVATE" } });
  });
  await t.test("changed content creates one revision and keeps the original revision intact", async () => {
    const changed = path.join(root, "checks", run); await mkdir(changed, { recursive: true });
    await cp(path.join(root, "assets"), path.join(changed, "assets"), { recursive: true });
    const input = JSON.parse(await readFile(path.join(root, "bundle.json"), "utf8"));
    const originalStatement = input.sections[0].records[0].material.texts[0].statement;
    input.sections[0].records[0].material.texts[0].statement += "<p>Pilot revision check.</p>";
    await writeFile(path.join(changed, "bundle.json"), JSON.stringify(input));
    const revision = await importPilot(actor, changed);
    assert.deepEqual([revision.created, revision.updated, revision.skipped], [0, 1, 55]);
    const oldVersion = await db().taskVersion.findFirstOrThrow({ where: { taskId: result.sections[0].taskIds[0], number: 1 }, include: { texts: true } });
    assert.equal(oldVersion.texts[0].statement, originalStatement);
    // Restore selected source content through an ordinary new revision, never reset a database.
    await importPilot(actor, root);
    input.assets[0].sha256 = "0".repeat(64); await writeFile(path.join(changed, "bundle.json"), JSON.stringify(input));
    const before = await db().taskVersion.count(); await assert.rejects(() => importPilot(actor, changed)); assert.equal(await db().taskVersion.count(), before);
  });
  const preview = await previewPilot(root);
  await writeFile(path.join(root, "import-result.json"), JSON.stringify({ ...result!, verified: true, tests: ["repeat", "revision", "file-hashes", "role-access", "formula-rendering", "ordered-structure"], preview }, null, 2));
}).finally(async () => { await db().$disconnect(); });
