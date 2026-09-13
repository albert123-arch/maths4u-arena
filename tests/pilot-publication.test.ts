import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/prisma";
import { userSelect, digest } from "../src/lib/security";
import { hashPassword } from "../src/lib/password";
import { checkPilotPublication, stagePilotAsset, publishPilot, APPROVED_PILOT } from "../src/lib/pilot-publish";
import { requirePilotDatabase, readPilot } from "../scripts/pilot/import";
import { courses } from "../src/lib/courses";
import { download } from "../src/lib/files";
import { GET, POST } from "../src/app/api/[...path]/route";
import { publicVersion, versionInclude } from "../src/lib/content";

test("approved real package publishes through admin flow and reapplies without changes", { timeout: 180000 }, async () => {
  requirePilotDatabase();
  const root = path.resolve(".local/content-pilot"), input = JSON.parse(await readFile(path.join(root, "bundle.json"), "utf8"));
  const { bundle } = await readPilot(root);
  assert.equal(digest(JSON.stringify(input)), APPROVED_PILOT);
  const password = randomBytes(24).toString("hex");
  const actor = await db().user.create({ data: { username: "publisher", displayName: "Publication test", passwordHash: await hashPassword(password), roles: { create: { role: "ADMIN" } }, profile: { create: {} } }, select: userSelect });
  const student = await db().user.create({ data: { username: "learner", displayName: "Publication student", passwordHash: await hashPassword(randomBytes(24).toString("hex")), roles: { create: { role: "STUDENT" } } }, select: userSelect });
  const usersBefore = digest(JSON.stringify(await db().user.findMany({ include: { roles: true } })));
  async function call(route: string, cookie: string, data: unknown, origin = process.env.APP_URL!) {
    return POST(new Request(process.env.APP_URL + "/api/" + route, { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify(data) }), { params: Promise.resolve({ path: route.split("/") }) });
  }
  const login = await call("auth/login", "", { username: actor.username, password });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await call("admin/import/pilot/check", cookie, input, "https://other.invalid")).status, 403);
  await assert.rejects(checkPilotPublication(student, input), /FORBIDDEN/);
  assert.equal((await call("admin/import/pilot/check", cookie, { ...input, selection: "changed" })).status, 400);
  assert.equal((await checkPilotPublication(actor, input)).missing.length, 37);
  await assert.rejects(publishPilot(actor, input), /PILOT_IMAGES_REQUIRED/);
  assert.equal(await db().course.count(), 0);
  for (const asset of bundle.assets) {
    const base64 = (await readFile(path.join(root, asset.file))).toString("base64");
    assert.equal((await call("admin/import/pilot/asset", cookie, { bundle: input, key: asset.key, base64 })).status, 200);
  }
  assert.equal((await checkPilotPublication(actor, input)).missing.length, 0);
  const response = await call("admin/import/pilot/publish", cookie, input);
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.deepEqual([report.created, report.updated, report.skipped, report.lessonVersionsCreated], [56, 0, 0, 2]);
  assert.equal(await db().taskText.count(), 76);
  assert.equal(await db().storedFile.count(), 37);
  assert.equal(await db().lessonTask.count(), 56);
  assert.equal(await db().olympiad.count(), 0);
  const counts = await Promise.all([db().task.count(), db().taskVersion.count(), db().lessonVersion.count(), db().storedFile.count()]);
  const repeated = await publishPilot(actor, input);
  assert.deepEqual([repeated.created, repeated.updated, repeated.skipped, repeated.filesCreated, repeated.lessonVersionsCreated], [0, 0, 56, 0, 0]);
  assert.deepEqual(await Promise.all([db().task.count(), db().taskVersion.count(), db().lessonVersion.count(), db().storedFile.count()]), counts);
  assert.equal(digest(JSON.stringify(await db().user.findMany({ include: { roles: true } }))), usersBefore);
  for (const section of bundle.sections) {
    const course = (await courses(student, "en", section.project + "-" + section.course.key))[0];
    assert.ok(!course.locked);
    assert.equal(course.topics[0].lessons[0].tasks?.length, section.records.length);
    assert.deepEqual(course.topics[0].lessons[0].tasks!.map(t => t.title), section.records.map(r => r.material.texts.find(t => t.locale === "en")!.title));
    for (const row of section.records) {
      const imported = await db().importRecord.findUniqueOrThrow({ where: { sourceProject_legacyId: { sourceProject: section.project, legacyId: row.id } } });
      const version = await db().taskVersion.findFirstOrThrow({ where: { taskId: imported.taskId }, include: versionInclude });
      for (const text of row.material.texts) {
        const stored = version.texts.find(t => t.locale === text.locale)!;
        for (const field of ["statement", "solution", "hint", "teacherNote"] as const) assert.equal(stored[field], text[field]);
        assert.ok(!JSON.stringify(publicVersion(version, text.locale, false)).includes('class="katex-error"'));
        assert.equal("solution" in publicVersion(version, text.locale, false), false);
      }
    }
  }
  for (const asset of bundle.assets) {
    assert.equal(digest((await download(actor, "pilot_" + asset.key)).data), asset.sha256);
    if (asset.role === "SOLUTION") await assert.rejects(download(student, "pilot_" + asset.key));
    else assert.equal(digest((await download(student, "pilot_" + asset.key)).data), asset.sha256);
  }
  const first = bundle.assets[0];
  assert.equal((await stagePilotAsset(actor, { bundle: input, key: first.key, base64: (await readFile(path.join(root, first.file))).toString("base64") })).created, false);
  await assert.rejects(stagePilotAsset(actor, { bundle: input, key: first.key, base64: "YWJj" }), /PILOT_ASSET_HASH_MISMATCH/);
  assert.equal((await GET(new Request(process.env.APP_URL + "/api/health"), { params: Promise.resolve({ path: ["health"] }) })).status, 200);
  await db().$disconnect();
});
