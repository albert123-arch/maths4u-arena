import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { changePresentation, lessonPresentations } from "../src/lib/presentations";
import { topicContent } from "../src/lib/catalog";
import { userSelect, digest, COOKIE, type Actor } from "../src/lib/security";
import { hashPassword } from "../src/lib/password";
import { GET, POST } from "../src/app/api/[...path]/route";

// Invoked by the populated-migration test, exclusively in its new isolated DB.
export async function verifyPresentations(admin: Actor, student: Actor) {
  assert.equal(process.env.MATHS4U_ENV, "test");
  assert.match(process.env.MATHS4U_DATABASE_NAME!, /^maths4u_test_pilot_/);
  const password = randomBytes(24).toString("hex"), hash = await hashPassword(password);
  const users = await Promise.all(["teacher", "other_teacher", "student"].map(name => db().user.create({ data: {
    username: "board_" + name, displayName: "Board " + name, passwordHash: hash,
    roles: { create: { role: name === "student" ? "STUDENT" : "TEACHER" } }, profile: { create: {} },
  }, select: userSelect })));
  const [teacher, other] = users;
  const course = await db().course.create({ data: { slug: "smartboard-check", published: true,
    texts: { create: [{ locale: "en", title: "Smart board check", description: "Local test" }, { locale: "ru", title: "Презентации для урока", description: "Локальная проверка" }] },
    topics: { create: {
      slug: "algebra", texts: { create: { locale: "en", title: "Algebra" } },
      lessons: { create: { versions: { create: { number: 1, texts: { create: [
        { locale: "en", title: "Quadratic equations", body: "\\(ax^2+bx+c=0\\)" },
        { locale: "ru", title: "Квадратные уравнения", body: "\\(ax^2+bx+c=0\\)" },
      ] } } } } },
    } },
  }, include: { topics: { include: { lessons: true } } } });
  const lessonId = course.topics[0].lessons[0].id;
  const create = { action: "save", title: "Quadratics · lesson 1", url: "https://docs.google.com/presentation/d/board_fixture_1/edit?usp=sharing" };
  await assert.rejects(changePresentation(student, lessonId, create), /FORBIDDEN/);
  await assert.rejects(lessonPresentations(student, lessonId, "en"), /FORBIDDEN/);
  await assert.rejects(changePresentation(teacher, lessonId, { ...create, url: "https://evil.test/slides" }), /INVALID_PRESENTATION_URL/);
  const first = await changePresentation(teacher, lessonId, create);
  await assert.rejects(changePresentation(other, lessonId, { ...create, url: "https://drive.google.com/file/d/board_fixture_1/view" }), /DUPLICATE_PRESENTATION/);
  await assert.rejects(changePresentation(other, lessonId, { ...create, id: first.id, revision: 0 }), /FORBIDDEN/);
  await assert.rejects(changePresentation(other, lessonId, { action: "remove", id: first.id, revision: 0 }), /FORBIDDEN/);
  const second = await changePresentation(other, lessonId, { ...create, title: "Worked examples", url: "https://drive.google.com/file/d/board_fixture_2/view?resourcekey=0_fixture" });
  let list = await lessonPresentations(teacher, lessonId, "en");
  assert.deepEqual(list.items.map(p => p.id), [first.id, second.id]);
  assert.deepEqual(list.items.map(p => p.editable), [true, false]);
  await changePresentation(teacher, lessonId, { action: "down", id: first.id, revision: 0 });
  list = await lessonPresentations(admin, lessonId, "ru");
  assert.equal(list.title, "Квадратные уравнения");
  assert.deepEqual(list.items.map(p => p.id), [second.id, first.id]);
  assert.ok(list.items.every(p => p.editable));
  await assert.rejects(changePresentation(teacher, lessonId, { ...create, id: first.id, revision: 0 }), /STALE_PRESENTATION/);
  await changePresentation(admin, lessonId, { ...create, id: first.id, revision: 1, title: "Updated by administrator" });
  const updated = await db().lessonPresentation.findUniqueOrThrow({ where: { id: first.id } });
  assert.equal(updated.ownerId, teacher.id);
  assert.equal(updated.revision, 2);
  const concurrent = await Promise.allSettled([1, 2].map(() => changePresentation(teacher, lessonId, { ...create, url: "https://docs.google.com/presentation/d/concurrent_fixture/edit" })));
  assert.equal(concurrent.filter(r => r.status === "fulfilled").length, 1, "Parent lock prevents concurrent duplicate links");
  const third = (await lessonPresentations(teacher, lessonId, "en")).items.find(p => p.sourceKey === "file:concurrent_fixture")!;
  await changePresentation(teacher, lessonId, { action: "remove", id: third.id, revision: third.revision });
  assert.ok((await db().lessonPresentation.findUniqueOrThrow({ where: { id: third.id } })).archivedAt);
  assert.equal((await lessonPresentations(teacher, lessonId, "en")).items.length, 2);
  for (const viewer of [null, student]) assert.ok(!JSON.stringify(await topicContent(viewer, lessonId, "en")).includes("board_fixture"), "Public topic must not leak presentation URLs");
  await db().course.update({ where: { id: course.id }, data: { published: false } });
  await assert.rejects(lessonPresentations(teacher, lessonId, "en"), /NOT_FOUND/);
  await assert.rejects(changePresentation(teacher, lessonId, create), /NOT_FOUND/);
  assert.equal((await lessonPresentations(admin, lessonId, "en")).items.length, 2);
  await db().course.update({ where: { id: course.id }, data: { published: true } });
  await db().lesson.update({ where: { id: lessonId }, data: { archivedAt: new Date() } });
  await assert.rejects(lessonPresentations(admin, lessonId, "en"), /NOT_FOUND/);
  await db().lesson.update({ where: { id: lessonId }, data: { archivedAt: null } });
  const tokens = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
  for (const [i, user] of [student, teacher].entries()) await db().session.create({ data: { userId: user.id, tokenHash: digest(tokens[i]), expiresAt: new Date(Date.now() + 3600000) } });
  const route = `teaching/topics/${lessonId}/presentations`, context = { params: Promise.resolve({ path: route.split("/") }) };
  for (const [token, expected] of [[null, 401], [tokens[0], 403], [tokens[1], 200]] as const) {
    const headers: Record<string, string> = token ? { cookie: `${COOKIE}=${token}` } : {};
    const response = await GET(new Request(process.env.APP_URL + "/api/" + route, { headers }), context);
    assert.equal(response.status, expected);
    assert.match(response.headers.get("Cache-Control")!, /no-store/);
  }
  for (const [token, origin, expected] of [[null, process.env.APP_URL!, 401], [tokens[0], process.env.APP_URL!, 403], [tokens[1], "https://evil.test", 403]] as const) {
    const response = await POST(new Request(process.env.APP_URL + "/api/" + route, { method: "POST", headers: { "content-type": "application/json", origin, ...(token ? { cookie: `${COOKIE}=${token}` } : {}) }, body: JSON.stringify(create) }), context);
    assert.equal(response.status, expected);
  }
  if (process.env.PILOT_LOCAL_TEST === "1") {
    await mkdir(".local/smartboard", { recursive: true });
    await writeFile(".local/smartboard/preview.json", JSON.stringify({ lessonId, courseSlug: course.slug, password, teacher: teacher.username, student: users[2].username, presentationId: first.id }));
    await writeFile(".local/smartboard/runtime.json", JSON.stringify(Object.fromEntries(["MATHS4U_ENV", "MATHS4U_DATABASE_URL", "MATHS4U_DATABASE_NAME", "PRIVATE_STORAGE_PATH"].map(key => [key, process.env[key]]).concat([["APP_URL", "http://127.0.0.1:3105"]]))));
  }
}
