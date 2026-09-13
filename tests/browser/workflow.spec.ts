import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { db } from "../../src/lib/prisma";
import { hashPassword } from "../../src/lib/password";
import { saveTask } from "../../src/lib/content";
import { saveCourse } from "../../src/lib/courses";
import { userSelect } from "../../src/lib/security";
import { mkdir, writeFile } from "node:fs/promises";
config({ path: ".local/test.env", override: true, quiet: true });
test.afterAll(async () => { await db().$disconnect(); await writeFile(".local/ui-server.stop", "stop"); });

test("desktop and mobile: register → class → assignment → autosave → submit → review → result", async ({ browser }) => {
  const run = randomBytes(4).toString("hex"), password = randomBytes(24).toString("base64url");
  const teacherUser = await db().user.create({ data: { username: "ui_teacher_" + run, displayName: "Учитель Мария", passwordHash: await hashPassword(password),
    roles: { create: [{ role: "TEACHER" }, { role: "ADMIN" }] }, profile: { create: {} } }, select: userSelect });
  const task = await saveTask(teacherUser, { visibility: "PUBLIC", texts: [
    { locale: "ru", title: "Сумма и доказательство " + run, statement: "<p>Вычислите \\(8+7\\).</p><table><tr><th>Число</th><th>Слагаемое</th></tr><tr><td>8</td><td>7</td></tr></table>", solution: "Получаем \\(15\\).", teacherNote: "Hidden teacher note" },
    { locale: "en", title: "Sum and proof " + run, statement: "<p>Calculate \\(8+7\\).</p>", solution: "We get \\(15\\)." },
  ], parts: [
    { kind: "NUMERIC", maxPoints: 2, numericAnswer: 15, texts: [{ locale: "ru", prompt: "Найдите сумму", answer: "15", rubric: "2 балла" }] },
    { kind: "MANUAL", maxPoints: 7, texts: [{ locale: "ru", prompt: "Объясните способ вычисления", answer: "8+2+5", rubric: "Частичные баллы допустимы." }] },
  ] });
  await saveCourse(teacherUser, { slug: "ui-" + run, topicSlug: "addition", topicRu: "Сложение", topicEn: "Addition",
    texts: [{ locale: "ru", title: "Математика каждый день", description: "Начните с основ." }, { locale: "en", title: "Everyday mathematics", description: "Start with the basics." }],
    lessonRu: "<p>\\(a+b=b+a\\). Переместительное свойство сложения.</p>", lessonEn: "<p>\\(a+b=b+a\\). Addition is commutative.</p>",
  });
  // The classroom scenario runs with teacher permissions only.
  await db().userRole.delete({ where: { userId_role: { userId: teacherUser.id, role: "ADMIN" } } });
  const teacherContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const teacher = await teacherContext.newPage();
  await teacher.goto("/login"); await teacher.getByLabel("Логин", { exact: true }).fill(teacherUser.username);
  await teacher.getByLabel("Пароль", { exact: true }).fill(password); await teacher.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(teacher).toHaveURL(/\/teacher$/);
  await teacher.goto("/teacher/classes");
  await teacher.getByLabel("Название класса").fill("7A · Математика " + run);
  await teacher.getByRole("button", { name: "Создать класс", exact: true }).click();
  await expect(teacher).toHaveURL(/\/teacher\/classes\/[a-z0-9]+$/);
  const classId = teacher.url().split("/").pop()!;
  const classroom = await db().classroom.findUniqueOrThrow({ where: { id: classId } });
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const student = await studentContext.newPage();
  await student.goto("/register");
  await student.getByLabel("Имя и фамилия").fill("Ученик Алексей");
  await student.getByLabel("Логин", { exact: true }).fill("ui_student_" + run);
  await student.getByLabel("Пароль", { exact: true }).fill(password);
  await student.getByRole("button", { name: "Создать аккаунт", exact: true }).click();
  await expect(student).toHaveURL(/\/student$/);
  await student.goto("/join-class/" + classroom.joinCode);
  await student.getByRole("button", { name: "Вступить", exact: true }).click();
  await expect(student).toHaveURL(/\/student$/);
  await teacher.goto("/teacher/works/new?class=" + classId + "&task=" + task.taskId);
  await teacher.getByLabel("Название работы").fill("Домашняя работа " + run);
  await teacher.getByRole("button", { name: "Назначить ученикам", exact: true }).click();
  await expect(teacher).toHaveURL(/\/works\/[a-z0-9]+\/results$/);
  const workId = teacher.url().split("/").at(-2)!;
  await student.goto("/student");
  await student.getByRole("link", { name: "Открыть →", exact: true }).first().click();
  await student.getByRole("button", { name: "Начать работу", exact: true }).click();
  await expect(student).toHaveURL(/\/attempts\/[a-z0-9]+$/);
  const attemptId = student.url().split("/").pop()!;
  await expect(student.locator(".katex").first()).toBeVisible();
  await student.getByLabel("Ваш ответ", { exact: true }).nth(0).fill("15");
  await student.getByLabel("Ваш ответ", { exact: true }).nth(1).fill("Сначала прибавим 2, затем ещё 5.");
  await expect(student.getByRole("status").filter({ hasText: "Сохранено" })).toBeVisible({ timeout: 15000 });
  await student.reload();
  await expect(student.getByLabel("Ваш ответ", { exact: true }).nth(0)).toHaveValue("15");
  await expect(student.getByLabel("Ваш ответ", { exact: true }).nth(1)).toHaveValue("Сначала прибавим 2, затем ещё 5.");
  expect(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mkdir("test-results/screenshots", { recursive: true });
  await student.screenshot({ path: "test-results/screenshots/mobile-attempt.png", fullPage: true });
  await student.getByRole("button", { name: "Отправить работу", exact: true }).click();
  await expect(student.getByText("Работа принята.", { exact: false })).toBeVisible();
  await teacher.goto("/attempts/" + attemptId + "/review");
  await teacher.locator('input[name^="points-"]').nth(1).fill("5.5");
  await teacher.locator('textarea[name^="comment-"]').nth(1).fill("Верно! Подробное объяснение.");
  await teacher.getByRole("button", { name: "Сохранить оценку и комментарии", exact: true }).click();
  await expect(teacher.getByText("Готово.", { exact: true })).toBeVisible();
  await teacher.goto("/works/" + workId + "/results");
  await teacher.getByRole("button", { name: "Опубликовать результаты", exact: true }).click();
  await expect(teacher.getByRole("button", { name: "Результаты опубликованы", exact: true })).toBeVisible();
  await student.reload();
  await expect(student.getByText("Верно! Подробное объяснение.", { exact: true })).toBeVisible();
  await expect(student.getByText("Hidden teacher note")).toHaveCount(0);
  await student.screenshot({ path: "test-results/screenshots/mobile-result.png", fullPage: true });
  await student.goto("/courses");
  await student.getByText("Сложение", { exact: true }).last().click();
  await expect(student.locator(".katex").last()).toBeVisible();
  expect(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await student.getByRole("button", { name: "EN", exact: true }).click();
  await expect(student.getByRole("heading", { name: "Courses", exact: true })).toBeVisible();
  await teacher.goto("/teacher");
  await expect(teacher.getByRole("heading", { name: "Здравствуйте, Учитель." })).toBeVisible();
  await teacher.screenshot({ path: "test-results/screenshots/teacher-dashboard.png", fullPage: true });
  await studentContext.close(); await teacherContext.close(); await db().$disconnect();
});
