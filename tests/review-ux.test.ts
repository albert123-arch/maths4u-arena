import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "../src/lib/prisma";
import { userSelect, digest, type Actor } from "../src/lib/security";
import { hashPassword } from "../src/lib/password";
import { readPilot, requirePilotDatabase } from "../scripts/pilot/import";
import { writePilot } from "../src/lib/pilot-import";
import { checkPilotCorrection, applyPilotCorrection } from "../src/lib/pilot-correction";
import { versionInclude } from "../src/lib/content";
import { createClass, joinClass } from "../src/lib/classrooms";
import { publishWork, startAttempt, mutateAttempt, getAttempt, gradeAttempt } from "../src/lib/works";
import { upload, download, removeAnswerFile } from "../src/lib/files";
import { GET, POST, DELETE } from "../src/app/api/[...path]/route";
import { importMaterials } from "../src/lib/importer";
import { formulaAudit } from "../scripts/pilot/prepare.mjs";

function twoPagePdf() {
  const streams = ["BT /F1 22 Tf 50 740 Td (Page 1: x squared + y squared = 25) Tj ET", "BT /F1 22 Tf 50 740 Td (Page 2: dy/dx = -x/y) Tj ET"];
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>",
    ...[5, 6].map(id => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents ${id} 0 R >>`),
    ...streams.map(s => `<< /Length ${s.length} >>\nstream\n${s}\nendstream`), "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((s, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${s}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 8\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
test("source correction, immutable work snapshots and attachment review", { timeout: 180000 }, async t => {
  requirePilotDatabase();
  const password = randomBytes(24).toString("base64url");
  const user = async (username: string, role: "ADMIN" | "TEACHER" | "STUDENT") => db().user.create({ data: { username, displayName: username, passwordHash: await hashPassword(password), roles: { create: { role } }, profile: { create: {} } }, select: userSelect });
  const admin = await user("ux_admin", "ADMIN"), teacher = await user("ux_teacher", "TEACHER"), student = await user("ux_student", "STUDENT"), other = await user("ux_other", "STUDENT"), stranger = await user("ux_other_teacher", "TEACHER");
  const { bundle, fileData } = await readPilot(path.resolve(".local/content-pilot"));
  const imported = await writePilot(admin, bundle, fileData, "historical-preview-fixture");
  const taskIds = imported.sections[0].taskIds;
  const classroom = await createClass(teacher, { title: "UX pilot class" }); await joinClass(student, { code: classroom.joinCode });
  const workData = (title: string) => ({ title, classId: classroom.id, taskIds: taskIds.slice(0, 2), opensAt: new Date(Date.now() - 10000), dueAt: new Date(Date.now() + 7 * 86400000), allowFiles: true, resultPolicy: "MANUAL", revealSolutions: true });
  const oldWork = await publishWork(teacher, workData("Before source correction")), oldAttempt = await startAttempt(student, oldWork.id);
  const oldDto = await getAttempt(student, oldAttempt.id), oldPart = oldDto.questions[0].parts[0].id;
  await mutateAttempt(student, oldAttempt.id, { revision: oldDto.revision, answers: [{ partId: oldPart, response: { value: "Preserved student reasoning" } }] }, true);
  await gradeAttempt(teacher, oldAttempt.id, { reviews: [{ partId: oldPart, points: 1.5, comment: "Preserved feedback" }] });
  const oldVersionId = oldDto.questions[0].id;
  const before = async () => digest(JSON.stringify({ users: await db().user.findMany({ orderBy: { id: "asc" }, include: { roles: true } }), attempt: await db().attempt.findUnique({ where: { id: oldAttempt.id }, include: { answers: { include: { review: true } } } }), version: await db().taskVersion.findUnique({ where: { id: oldVersionId }, include: versionInclude }), links: await db().lessonTask.findMany({ orderBy: [{ lessonId: "asc" }, { position: "asc" }] }), work: await db().workVersion.findUnique({ where: { id: oldWork.versions[0].id }, include: { items: true } }) }));
  const correction = JSON.parse(await readFile(".local/content-pilot-correction/correction.json", "utf8"));
  await t.test("dry-run and repeat correction preserve IDs, versions, marks, files and account hashes", async () => {
    const fingerprint = await before(), count = await db().storedFile.count();
    const plan = await checkPilotCorrection(admin, correction); assert.equal(plan.updatedTasks, 36); assert.equal(plan.filesCreated, 0);
    assert.equal(await before(), fingerprint);
    await assert.rejects(applyPilotCorrection(student, { correction, fingerprint: plan.fingerprint }), /FORBIDDEN/);
    await applyPilotCorrection(admin, { correction, fingerprint: plan.fingerprint });
    assert.equal(await before(), fingerprint); assert.equal(await db().storedFile.count(), count);
    const repeat = await checkPilotCorrection(admin, correction); assert.equal(repeat.updatedTasks, 0); assert.equal(repeat.lesson.action, "unchanged");
    const versions = await db().taskVersion.count(); await applyPilotCorrection(admin, { correction, fingerprint: plan.fingerprint }); assert.equal(await db().taskVersion.count(), versions);
    for (const row of correction.tasks) {
      const r = await db().importRecord.findUniqueOrThrow({ where: { sourceProject_legacyId: { sourceProject: "maths4u", legacyId: row.legacyId } } });
      const v = await db().taskVersion.findFirstOrThrow({ where: { taskId: r.taskId }, orderBy: { number: "desc" }, include: versionInclude });
      assert.equal(v.texts[0].solution, row.solution); assert.equal(v.texts[0].markScheme, row.markScheme); assert.equal(v.assets.filter(a => a.role === "MARK_SCHEME").length, row.files.length);
    }
    const source = JSON.parse(await readFile(".local/content-pilot/bundle.json", "utf8"));
    const countFormulas = (html:string) => { const a=formulaAudit(html); assert.equal(a.errors.length,0); assert.equal(a.unpairedDelimiter,false); return a.count; };
    const oldMath = source.sections[0].records.reduce((n:number,r:{material:{texts:{solution:string}[]}})=>n+countFormulas(r.material.texts[0].solution),0);
    assert.equal(correction.tasks.reduce((n:number,r:{solution:string;markScheme:string})=>n+countFormulas(r.solution)+countFormulas(r.markScheme),0),oldMath);
    for(const translated of correction.lesson.texts) {
      const old = source.sections[1].lesson.texts.find((t:{locale:string})=>t.locale===translated.locale);
      assert.equal(countFormulas(translated.body)+countFormulas(translated.examples),countFormulas(old.body));
    }
    await assert.rejects(writePilot(admin, bundle, new Map(), "historical-preview-fixture"), /PILOT_LEGACY_PACKAGE_REQUIRES_CORRECTION/);
    await assert.rejects(importMaterials(admin, { project: "maths4u", records: [{ id: bundle.sections[0].records[0].id, material: bundle.sections[0].records[0].material }] }), /PILOT_USE_CORRECTION_ROUTE/);
  });
  const newWork = await publishWork(teacher, workData("Проверка вложений / Attachment review")), attempt = await startAttempt(student, newWork.id);
  const dto = await getAttempt(student, attempt.id), partId = dto.questions[0].parts[0].id;
  const png = await sharp({ create: { width: 1600, height: 2200, channels: 3, background: "white" } }).composite([{ input: Buffer.from('<svg width="1600" height="2200"><text x="80" y="130" font-size="44" fill="black">Test scan: dy/dx = 2x + 3</text><text x="80" y="210" font-size="24">Small mathematical notation: x², fractions 1/2, minus signs</text></svg>') }]).png().toBuffer();
  const file = () => new File([new Uint8Array(png)], "reasoning.png", { type: "image/png" });
  const fixtures = path.resolve(".local/content-pilot-correction/fixtures"); await mkdir(fixtures, { recursive: true }); await writeFile(path.join(fixtures, "scan.png"), png); await writeFile(path.join(fixtures, "two-pages.pdf"), twoPagePdf());
  let uploaded: Awaited<ReturnType<typeof upload>>;
  await t.test("private originals and derivatives use identical access checks; assigned MS stays hidden", async () => {
    uploaded = await upload(student, file(), attempt.id, partId);
    const saved = await db().storedFile.findUniqueOrThrow({ where: { id: uploaded.id }, include: { derivatives: true } }); assert.equal(saved.derivatives.length, 2); assert.equal(saved.sha256, digest(png));
    for (const variant of ["original", "preview", "thumbnail"]) {
      for (const actor of [other, stranger, null]) await assert.rejects(download(actor, uploaded.id, variant));
      assert.ok((await download(teacher, uploaded.id, variant)).data.length);
    }
    const msId = correction.tasks[0].files[0].id;
    await assert.rejects(download(student, msId)); await assert.rejects(download(other, msId)); await assert.rejects(download(stranger, msId)); await assert.rejects(download(null, msId));
    assert.ok((await download(teacher, msId)).data.length); assert.equal("markScheme" in dto.questions[0], false);
    assert.ok((await getAttempt(teacher, attempt.id)).questions[0].markScheme); assert.notEqual(dto.questions[0].id, oldVersionId);
  });
  await t.test("limits, malformed images, EXIF orientation, concurrent uploads, atomic replacement and removal", async () => {
    await assert.rejects(upload(student, new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), attempt.id, partId), /FILE_TOO_LARGE/);
    await assert.rejects(upload(student, new File([new Uint8Array(png.subarray(0, 50))], "broken.png", { type: "image/png" }), attempt.id, partId), /INVALID_IMAGE|IMAGE_DECODE_FAILED/);
    const large = await sharp({ create: { width: 6400, height: 6400, channels: 3, background: "white" } }).png().toBuffer();
    await assert.rejects(upload(student, new File([new Uint8Array(large)], "pixels.png", { type: "image/png" }), attempt.id, partId), /IMAGE_PIXEL_LIMIT/);
    const exif = await sharp(png).resize(300, 400).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const rotated = await upload(student, new File([new Uint8Array(exif)], "phone.jpg", { type: "image/jpeg" }), attempt.id, partId);
    const stored = await db().storedFile.findUniqueOrThrow({ where: { id: rotated.id } }); assert.equal(stored.width, 400); assert.equal(stored.height, 300);
    const parallel = await Promise.allSettled(Array.from({ length: 4 }, () => upload(student, file(), attempt.id, partId)));
    assert.equal(parallel.filter(r => r.status === "fulfilled").length, 3);
    await assert.rejects(upload(student, file(), attempt.id, partId), /FILE_LIMIT/);
    const replace = await upload(student, new File([new Uint8Array(twoPagePdf())], "two-pages.pdf", { type: "application/pdf" }), attempt.id, partId, rotated.id);
    assert.equal((await getAttempt(student, attempt.id)).answers[0].files.length, 5); await assert.rejects(download(student, rotated.id));
    await removeAnswerFile(student, uploaded.id, attempt.id); await assert.rejects(download(student, uploaded.id, "preview"));
    const removed = await db().storedFile.findUniqueOrThrow({ where: { id: uploaded.id }, include: { derivatives: true } }); assert.ok(removed.deletedAt); assert.equal(removed.derivatives.length, 0);
    assert.ok((await download(student, replace.id)).data.includes(Buffer.from("/Count 2")));
  });
  await t.test("blank points stay ungraded; feedback and stale-review protection survive reload; submitted files are immutable", async () => {
    const current = await getAttempt(student, attempt.id);
    await mutateAttempt(student, attempt.id, { revision: current.revision, answers: [{ partId, response: { value: "My derivative reasoning" } }] }, true);
    await gradeAttempt(teacher, attempt.id, { reviews: [{ partId, points: null, comment: "Please explain the normal", revision: 0 }] });
    const reviewed = await getAttempt(teacher, attempt.id); assert.equal(reviewed.answers[0].points, null); assert.equal(reviewed.pendingReview, true); assert.equal(reviewed.answers[0].comment, "Please explain the normal");
    assert.equal((await getAttempt(student, attempt.id)).answers[0].comment, undefined);
    await assert.rejects(gradeAttempt(teacher, attempt.id, { reviews: [{ partId, points: 0, revision: 0 }] }), /STALE_REVIEW/);
    await assert.rejects(gradeAttempt(student, attempt.id, { reviews: [{ partId, points: 0 }] }), /FORBIDDEN/);
    await assert.rejects(upload(student, file(), attempt.id, partId), /ATTEMPT_FINISHED/);
    const id = reviewed.answers[0].files[0].id; await assert.rejects(removeAnswerFile(student, id, attempt.id), /ATTEMPT_FINISHED/);
    await assert.rejects(upload(student, file(), attempt.id, partId, id), /ATTEMPT_FINISHED/);
  });
  await t.test("direct API originals/derivatives reject guests and other accounts; expiry commits without accepting a new upload", async () => {
    const api = async (method: "GET" | "POST" | "DELETE", route: string, cookie = "", body?: unknown, headers = {}) => ({ GET, POST, DELETE }[method])(new Request(process.env.APP_URL + "/api/" + route, { method, headers: { cookie, origin: process.env.APP_URL!, "content-type": "application/json", ...headers }, ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }) }), { params: Promise.resolve({ path: route.split("?")[0].split("/") }) });
    const login = async (actor: Actor) => (await api("POST", "auth/login", "", { username: actor.username, password })).headers.get("set-cookie")!.split(";")[0];
    const otherCookie = await login(other), teacherCookie = await login(teacher), studentCookie = await login(student);
    const submitted = await getAttempt(teacher, attempt.id), f = submitted.answers[0].files[0];
    for (const cookie of ["", otherCookie]) for (const variant of ["original", "preview", "thumbnail"]) assert.equal((await api("GET", `files/${f.id}?variant=${variant}`, cookie)).status, 404);
    assert.equal((await api("GET", `files/${f.id}`, teacherCookie, undefined, { range: "bytes=0-9" })).status, 206);
    assert.equal((await api("DELETE", `files/${f.id}?attemptId=${attempt.id}`, studentCookie)).status, 409);
    const expiring = await publishWork(teacher, workData("Expiry test")), exp = await startAttempt(student, expiring.id);
    const expPart = (await getAttempt(student, exp.id)).questions[0].parts[0].id;
    await db().attempt.update({ where: { id: exp.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await assert.rejects(upload(student, file(), exp.id, expPart), /TIME_EXPIRED/);
    assert.equal((await db().attempt.findUniqueOrThrow({ where: { id: exp.id } })).status, "SUBMITTED");
  });
  await joinClass(other,{code:classroom.joinCode});
  const peer=await startAttempt(other,newWork.id), peerDto=await getAttempt(other,peer.id);
  await mutateAttempt(other,peer.id,{revision:peerDto.revision,answers:[{partId:peerDto.questions[0].parts[0].id,response:{value:"Second student's reasoning"}}]},true);
  await writeFile(".local/content-pilot-correction/preview.json", JSON.stringify({ admin: admin.username, teacher: teacher.username, student: student.username, password, attemptId: attempt.id, peerAttemptId:peer.id, workId: newWork.id, classId: classroom.id, taskIds, fixtures }));
  console.log("Stage 1 preview fixture ready; local credentials stored privately.");
  await db().$disconnect();
});
