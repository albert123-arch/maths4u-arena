import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { userSelect } from "../src/lib/security";
import { requirePilotDatabase } from "../scripts/pilot/import";
import { catalog, courseCatalog, topicContent, basket, saveBasket } from "../src/lib/catalog";
import { saveTask } from "../src/lib/content";
import { publishWork } from "../src/lib/works";

test("catalog pagination, latest metadata, permissions and persistent ordered teacher basket", { timeout: 180000 }, async t => {
  requirePilotDatabase();
  const fixture = JSON.parse(await readFile(".local/content-pilot-correction/preview.json", "utf8"));
  const admin = await db().user.findUniqueOrThrow({ where: { username: fixture.admin }, select: userSelect }), teacher = await db().user.findUniqueOrThrow({ where: { username: fixture.teacher }, select: userSelect }), student = await db().user.findUniqueOrThrow({ where: { username: fixture.student }, select: userSelect }), stranger = await db().user.findUniqueOrThrow({ where: { username: "ux_other_teacher" }, select: userSelect });
  const suffix = randomBytes(4).toString("hex");
  const c = await db().course.create({ data: { slug: "qa-catalog-" + suffix, published: true, texts: { create: [{ locale: "en", title: "Catalog QA " + suffix, description: "Local test data only" }, { locale: "ru", title: "Каталог: тест " + suffix, description: "Только локальные тестовые данные" }] }, topics: { create: { slug: "chapter", texts: { create: [{ locale: "en", title: "Chapter" }, { locale: "ru", title: "Глава" }] } } } }, include: { topics: true } });
  const lessons = await Promise.all([1, 2].map(n => db().lesson.create({ data: { topicId: c.topics[0].id, versions: { create: { number: 1, texts: { create: [{ locale: "en", title: "Topic " + n, body: "<p>Test theory</p>", examples: "<p>Worked example</p>" }, { locale: "ru", title: "Тема " + n, body: "<p>Тестовая теория</p>", examples: "<p>Пример</p>" }] } } } } })));
  const taskInput = (n: number, extra = {}) => ({ visibility: "PUBLIC", materialCategory: "TRAINING", difficulty: 2, difficultyKnown: true, topicIds: [c.topics[0].id], texts: [{ locale: "en", title: `QA ${suffix} ${String(n).padStart(3, "0")}`, statement: "<p>Find \\(x^2\\).</p>" }, { locale: "ru", title: `QA ${suffix} ${String(n).padStart(3, "0")}`, statement: "<p>Найдите \\(x^2\\).</p>" }], parts: [{ kind: "MANUAL", maxPoints: 2, texts: [{ locale: "en", prompt: "Explain" }, { locale: "ru", prompt: "Объясните" }] }], ...extra });
  const ids: string[] = [];
  for (let n = 0; n < 124; n++) {
    const v = await saveTask(admin, taskInput(n, n >= 120 ? { visibility: "PRIVATE" } : {})); ids.push(v.taskId);
    await db().lessonTask.create({ data: { taskId: v.taskId, lessonId: lessons[n < 60 ? 0 : 1].id, position: n < 60 ? n : n - 60 } });
  }
  await t.test("all 120 accessible records are paginated without leaking four private records; facets reflect real metadata", async () => {
    const first = await catalog(student, "ru", { course: c.id }); assert.equal(first.total, 120); assert.equal(first.pages, 5); assert.deepEqual(first.facets.years, []);
    const all = [];
    for (let page = 1; page <= first.pages; page++) all.push(...(await catalog(teacher, "en", { course: c.id, page })).items.map(t => t.id));
    assert.equal(all.length, 120); assert.equal(new Set(all).size, 120);
    assert.equal((await catalog(null, "en", { course: c.id })).total, 120); assert.equal((await catalog(admin, "en", { course: c.id })).total, 124);
    const tree = (await courseCatalog(student, "en", c.slug))[0]; assert.equal(tree.count, 120); assert.deepEqual(tree.chapters[0].topics.map(t => t.count).sort((a,b) => a-b), [60, 60]);
    assert.equal((await topicContent(student, lessons[0].id, "ru")).body, "<p>Тестовая теория</p>");
    assert.deepEqual((await catalog(student, "en", { topic: lessons[0].id })).items.map(t => t.id), ids.slice(0, 25));
    await saveTask(admin, taskInput(999, { materialCategory: "EXAM", year: 2024, examSession: "May", paper: "12" }), ids[0]);
    assert.equal((await catalog(student, "en", { q: `QA ${suffix} 000` })).total, 0);
    const exams = await catalog(student, "en", { course: c.id, category: "EXAM", year: "2024", session: "May", paper: "12" }); assert.equal(exams.total, 1); assert.equal(exams.items[0].id, ids[0]);
  });
  await t.test("basket survives reload and reordering, is account-isolated and detects stale updates and unavailable tasks", async () => {
    let saved = await basket(teacher, "en"); saved = await saveBasket(teacher, { revision: saved.revision, taskIds: [ids[60], ids[0]] }, "en");
    assert.deepEqual((await basket(teacher, "ru")).taskIds, [ids[60], ids[0]]); assert.equal((await basket(stranger, "en")).taskIds.length, 0);
    await assert.rejects(basket(student, "en"), /FORBIDDEN/);
    await assert.rejects(saveBasket(teacher, { revision: saved.revision - 1, taskIds: [] }, "en"), /STALE_BASKET/);
    saved = await saveBasket(teacher, { revision: saved.revision, taskIds: [ids[0], ids[60]] }, "en");
    const workInput = { title: "Basket snapshot", classId: fixture.classId, taskIds: saved.taskIds, opensAt: new Date(Date.now() - 1000), dueAt: new Date(Date.now() + 86400000) };
    const work = await publishWork(teacher, workInput);
    const items = await db().workItem.findMany({ where: { workVersionId: work.versions[0].id }, orderBy: { position: "asc" }, include: { taskVersion: true } });
    assert.deepEqual(items.map(i => i.taskVersion.taskId), saved.taskIds);
    await saveTask(admin, taskInput(998), ids[60]);
    assert.equal((await db().workItem.findUniqueOrThrow({ where: { id: items[1].id } })).taskVersionId, items[1].taskVersionId);
    await db().task.update({ where: { id: ids[0] }, data: { archivedAt: new Date() } });
    assert.equal((await basket(teacher, "en")).items[0].available, false);
    await assert.rejects(publishWork(teacher, workInput), /TASK_UNAVAILABLE/);
    await db().task.update({ where: { id: ids[0] }, data: { archivedAt: null } });
    await saveBasket(teacher, { revision: saved.revision, taskIds: [] }, "en");
  });
  await writeFile(".local/content-pilot-correction/catalog-preview.json", JSON.stringify({ courseId: c.id, courseSlug: c.slug, lessonIds: lessons.map(l => l.id), taskIds: ids, suffix }));
  await db().$disconnect();
});
