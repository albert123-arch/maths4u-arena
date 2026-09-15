import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, cp, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { db } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { digest, userSelect } from "../src/lib/security";
import { publicVersion, versionInclude } from "../src/lib/content";
import { validatePilot } from "../src/lib/pilot-schema";
import { writePilot } from "../src/lib/pilot-import";
import { checkPilotPublication } from "../src/lib/pilot-publish";
import { courses } from "../src/lib/courses";
import { GET, POST } from "../src/app/api/[...path]/route";
import { beginStudy, revealStudyHelp, selfCheckStudy, topicStudy } from "../src/lib/study";
import { getAttempt, mutateAttempt } from "../src/lib/works";
import { exportTask, taskSchema } from "../src/lib/content";
import {verifyBankFixture} from './bank-fixture';

test("populated migration and publication preserve existing accounts, tasks, attempts and grades", { timeout: 180000 }, async () => {
  const ci = process.env.CI === "true" && process.env.HOSTINGER_TEST_CREATE_DATABASE === "1";
  assert.ok(ci || process.env.PILOT_LOCAL_TEST === "1", "Explicit isolated test setup required");
  const password = ci ? "" : JSON.parse((await readFile(".local/db-secrets.json", "utf8")).replace(/^\uFEFF/, "")).rootPassword;
  const port = ci ? 3306 : 33317, suffix = randomBytes(7).toString("hex"), database = "maths4u_test_pilot_" + suffix;
  const username = "pilot_" + suffix, appPassword = randomBytes(32).toString("hex");
  const root = await mysql.createConnection({ host: "127.0.0.1", port, user: "root", password });
  try {
    await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const accountHost = ci ? "%" : "127.0.0.1";
    await root.query("CREATE USER ?@? IDENTIFIED BY ?", [username, accountHost, appPassword]);
    await root.query(`GRANT ALL ON \`${database}\`.* TO ?@?`, [username, accountHost]);
  } finally { await root.end(); }
  const directory = path.resolve(".local/content-pilot/checks", suffix);
  Object.assign(process.env, { MATHS4U_ENV: "test", MATHS4U_DATABASE_URL: `mysql://${username}:${appPassword}@127.0.0.1:${port}/${database}`,
    MATHS4U_DATABASE_NAME: database, PRIVATE_STORAGE_PATH: path.join(directory, "storage"), APP_URL: "http://127.0.0.1:3101" });
  await mkdir(path.join(directory, "migrations"), { recursive: true });
  await cp("prisma/migrations/202609130001_platform", path.join(directory, "migrations/202609130001_platform"), { recursive: true });
  await cp("prisma/migrations/migration_lock.toml", path.join(directory, "migrations/migration_lock.toml"));
  const configFile = path.join(directory, "prisma.config.ts");
  await writeFile(configFile, `import { defineConfig } from 'prisma/config'; export default defineConfig({schema:${JSON.stringify(path.resolve("prisma/schema.prisma"))}, migrations:{path:${JSON.stringify(path.join(directory, "migrations"))}}, datasource:{url:process.env.MATHS4U_DATABASE_URL}});`);
  function migrate(config?: string) {
    const run = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", ...(config ? ["--config", config] : [])], { env: process.env, encoding: "utf8", windowsHide: true, timeout: 60000 });
    assert.equal(run.status, 0, "Prisma migrate deploy must succeed; output withheld to protect test credentials");
  }
  migrate(configFile);
  const client = db();
  const session = await client.$queryRawUnsafe<Array<{ collation: string }>>("SELECT @@collation_connection AS collation");
  assert.equal(session[0].collation, "utf8mb4_unicode_ci", "Application connections must match the existing schema's collation");
  const sql = await mysql.createConnection({ host: "127.0.0.1", port, user: username, password: appPassword, database });
  try {
    const admin = await client.user.create({ data: { username: "preserve_admin", displayName: "Migration administrator", passwordHash: await hashPassword(randomBytes(24).toString("hex")), roles: { create: { role: "ADMIN" } }, profile: { create: {} } }, select: userSelect });
    const student = await client.user.create({ data: { username: "preserve_student", displayName: "Migration student", passwordHash: await hashPassword(randomBytes(24).toString("hex")), roles: { create: { role: "STUDENT" } } }, select: userSelect });
    // Seed the historical schema explicitly: the current Prisma Client knows columns
    // that do not exist until the upgrade under test has actually run.
    const version = { id: "preserve_version" }, part = { id: "preserve_part" };
    await sql.execute("INSERT INTO Task (id,ownerId,visibility) VALUES (?,?,?)", ["preserve_task",admin.id,"PRIVATE"]);
    await sql.execute("INSERT INTO TaskVersion (id,taskId,number) VALUES (?,?,1)", [version.id,"preserve_task"]);
    await sql.execute("INSERT INTO TaskText (versionId,locale,title,statement,hint,solution,teacherNote) VALUES (?,'en','Existing task','Existing content','','Existing solution','')", [version.id]);
    await sql.execute("INSERT INTO TaskPart (id,versionId,position,kind,maxPoints) VALUES (?,?,0,'MANUAL',4)",[part.id,version.id]);
    await sql.execute("INSERT INTO PartText (partId,locale,prompt,answer,rubric) VALUES (?,'en','Explain','Existing answer','Existing rubric')",[part.id]);
    const work = await client.work.create({ data: { ownerId: admin.id, title: "Existing assessment", kind: "TEST", versions: { create: { opensAt: new Date(), dueAt: new Date(Date.now() + 60000), items: { create: { taskVersionId: version.id, position: 0, maxPoints: 4 } } } } }, include: { versions: true } });
    const attempt = await client.attempt.create({ data: { userId: student.id, workVersionId: work.versions[0].id, number: 1, status: "GRADED", expiresAt: new Date(), submittedAt: new Date(), gradedAt: new Date(), answers: { create: { partId: part.id, response: { text: "Student work" } } } },include:{answers:true} });
    await sql.execute("INSERT INTO Review (id,answerId,reviewerId,points,comment,reviewedAt) VALUES ('preserve_review',?,?,3,'Preserve this grade',CURRENT_TIMESTAMP(3))",[attempt.answers[0].id,admin.id]);
    const [baselineTables] = await sql.query<mysql.RowDataPacket[]>("SHOW TABLES");
    const columns = new Map<string,string[]>();
    for (const row of baselineTables) {
      const name = String(Object.values(row)[0]); if(name === "_prisma_migrations") continue;
      assert.match(name,/^[a-zA-Z_][a-zA-Z0-9_]*$/);
      const [fields] = await sql.query<mysql.RowDataPacket[]>(`SHOW COLUMNS FROM \`${name}\``);
      columns.set(name, fields.map(f => String(f.Field)));
    }
    async function snapshot() {
      const result: Record<string, string[]> = {};
      for (const [name,fields] of columns) {
        const [rows] = await sql.query<mysql.RowDataPacket[]>(`SELECT ${fields.map(f=>'`'+f+'`').join(',')} FROM \`${name}\``);
        result[name.toLowerCase()] = rows.map(r => digest(JSON.stringify(r))).sort();
      }
      return result;
    }
    const before = await snapshot();
    assert.equal(before.lessontask, undefined);
    migrate();
    let after = await snapshot();
    assert.equal(await client.lessonTask.count(), 0);
    assert.equal(await client.practiceStudy.count(), 0);
    assert.equal(await client.fileDerivative.count(), 0);
    const upgraded = await client.taskVersion.findUniqueOrThrow({where:{id:version.id},include:{texts:true}});
    assert.equal(upgraded.texts[0].markScheme, null); assert.equal(upgraded.difficultyKnown,false);
    assert.deepEqual(after, before, "Every pre-existing row, including passwords, roles and grades, must remain byte-equivalent");
    migrate();
    after = await snapshot(); delete after.lessontask;
    assert.deepEqual(after, before, "Repeated migration must preserve every existing row");
    const bundle = validatePilot({ format: "maths4u-pilot-v1", selection: "synthetic-ci", assets: [], sections: [{ project: "olymp", key: "ci", sourceUrl: "https://olymp.maths4u.sbs/", course: { key: "ci", texts: [{ locale: "en", title: "CI course" }] }, topic: { key: "topic", position: 7, texts: [{ locale: "en", title: "CI topic" }] }, lesson: { key: "lesson", texts: [{ locale: "en", title: "CI lesson", body: "\\(a+b\\)" }] }, records: [{ id: "ci-record", position: 3, sourceUrl: "https://olymp.maths4u.sbs/", metadata: {}, material: { visibility: "PRIVATE", texts: [{ locale: "en", title: "CI task", statement: "\\(x^2\\)", solution: "Private solution", hint: "Hint" }], parts: [{ kind: "MANUAL", maxPoints: 1, texts: [{ locale: "en", prompt: "Explain", answer: "Answer", rubric: "Rubric" }] }] } }] }] });
    await assert.rejects(checkPilotPublication(admin, bundle), /PILOT_PACKAGE_NOT_APPROVED/);
    await assert.rejects(checkPilotPublication(student, bundle), /FORBIDDEN/);
    const published = await writePilot(admin, bundle, new Map(), "synthetic-ci");
    assert.equal(published.created, 1);
    const repeated = await writePilot(admin, bundle, new Map(), "synthetic-ci");
    assert.deepEqual([repeated.created, repeated.updated, repeated.skipped, repeated.lessonVersionsCreated], [0, 0, 1, 0]);
    const current = await snapshot();
    for (const [table, hashes] of Object.entries(before)) for (const hash of hashes) assert.ok(current[table].includes(hash), `Existing ${table} row must survive publication`);
    assert.equal(await client.olympiad.count(), 0);
    assert.equal((await courses(student, "en", "olymp-ci"))[0].topics[0].lessons[0].tasks?.[0].position, 3);
    const imported = await client.taskVersion.findFirstOrThrow({ where: { taskId: published.sections[0].taskIds[0] }, include: versionInclude });
    assert.equal("solution" in publicVersion(imported, "en", false), false);
    const exported = await exportTask(admin, imported.taskId);
    assert.equal(taskSchema.parse(exported.records[0].material).texts[0].solution,"Private solution");
    await assert.rejects(exportTask(student, imported.taskId), /FORBIDDEN/);
    const study = await beginStudy(student, {taskId: imported.taskId, lessonId:published.sections[0].lessonId},"en");
    let dto=await getAttempt(student,study.id,"en"); assert.equal(dto.questions[0].solution,undefined);
    await revealStudyHelp(student,study.id,{kind:"hint"},"en");
    dto=await getAttempt(student,study.id,"en"); assert.equal(dto.questions[0].hint,"Hint");assert.equal(dto.questions[0].solution,undefined);
    await mutateAttempt(student,study.id,{revision:dto.revision,answers:[{partId:dto.questions[0].parts[0].id,response:{value:"Explain"}}]},true);
    await selfCheckStudy(student,study.id,{state:"SELF_CHECKED"});
    assert.equal((await getAttempt(student,study.id)).status,"SUBMITTED");
    assert.equal((await topicStudy(student,published.sections[0].lessonId,"en")).items[0].state,"SELF_CHECKED");
    for (const route of ["admin/import/pilot/check", "admin/import/pilot/asset", "admin/import/pilot/publish", "tasks/anything/practice"]) {
      const response = await POST(new Request(process.env.APP_URL + "/api/" + route, { method: "POST", headers: { origin: process.env.APP_URL!, "content-type": "application/json" }, body: "{}" }), { params: Promise.resolve({ path: route.split("/") }) });
      assert.equal(response.status, 401);
    }
    assert.equal((await GET(new Request(process.env.APP_URL + "/api/health"), { params: Promise.resolve({ path: ["health"] }) })).status, 200);
    await verifyBankFixture(admin,student);
    const finalSnapshot=await snapshot();for(const [table,hashes]of Object.entries(before))for(const hash of hashes)assert.ok(finalSnapshot[table].includes(hash),`Historical ${table} row survives bank import`);
  } finally { await sql.end(); await client.$disconnect(); }
});
