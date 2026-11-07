import { test } from "node:test";
import assert from "node:assert/strict";
import { BASIC_TEACHER_LIMITS, canAddActiveClass, canAddActiveStudents, canUseTeacherLibrary, teacherLimits } from "../src/lib/teacher-account-model";
import { register, registrationSchema, type Actor } from "../src/lib/security";
import { createClass, editClass, joinClass } from "../src/lib/classrooms";
import type { Prisma } from "../src/generated/prisma/client";
import { createWork, workSchema } from "../src/lib/works";

const input = { username: "new_teacher", displayName: "New Teacher", password: "secure-password-123" };
test("self-registration permits only student and teacher account types and discards arbitrary roles", () => {
  assert.equal(registrationSchema.parse(input).accountType, "STUDENT");
  assert.equal(registrationSchema.parse({ ...input, accountType: "TEACHER", role: "ADMIN", roles: ["ADMIN"] }).accountType, "TEACHER");
  assert.equal("roles" in registrationSchema.parse({ ...input, roles: ["ADMIN"] }), false);
  for (const accountType of ["ADMIN", "OWNER", "teacher", null]) assert.equal(registrationSchema.safeParse({ ...input, accountType }).success, false);
});

test("self-declared teacher workspace access does not grant the legacy library entitlement", () => {
  const roles = [{ role: "TEACHER" }];
  assert.equal(canUseTeacherLibrary(null), false);
  assert.equal(canUseTeacherLibrary({ roles: [{ role: "STUDENT" }] }), false);
  assert.equal(canUseTeacherLibrary({ roles }), true);
  assert.equal(canUseTeacherLibrary({ roles, teacherAccount: null }), true);
  assert.equal(canUseTeacherLibrary({ roles, teacherAccount: { selfRegistered: false } }), true);
  assert.equal(canUseTeacherLibrary({ roles, teacherAccount: { selfRegistered: true } }), false);
  assert.equal(canUseTeacherLibrary({ roles: [{ role: "ADMIN" }], teacherAccount: { selfRegistered: true } }), true);
  assert.equal(canUseTeacherLibrary({ roles: [{ role: "STUDENT" }], teacherAccount: { selfRegistered: true } }), false);
});

test("basic class limits apply only to new self-service accounts", () => {
  const basic = teacherLimits({ selfRegistered: true, ...BASIC_TEACHER_LIMITS });
  assert.deepEqual(basic, { maxActiveClasses: 3, maxDistinctStudents: 100 });
  assert.equal(teacherLimits(null), null);
  assert.equal(teacherLimits({ selfRegistered: false, ...BASIC_TEACHER_LIMITS }), null);
  assert.equal(canAddActiveClass(basic, 2), true);
  assert.equal(canAddActiveClass(basic, 3), false);
  assert.equal(canAddActiveClass(null, 99), true);
});

test("learner capacity counts distinct active learners and keeps existing memberships usable", () => {
  const limits = { maxActiveClasses: 3, maxDistinctStudents: 2 };
  assert.equal(canAddActiveStudents(limits, ["a"], ["a", "b", "b"]), true);
  assert.equal(canAddActiveStudents(limits, ["a", "b"], ["b"]), true);
  assert.equal(canAddActiveStudents(limits, ["a", "b"], ["c"]), false);
  assert.equal(canAddActiveStudents(limits, ["a", "b", "c"], ["a"]), true);
  assert.equal(canAddActiveStudents(limits, ["a", "b", "c"], ["d"]), false);
  assert.equal(canAddActiveStudents(null, ["a", "b"], ["c", "d"]), true);
});

async function withFakeDatabase<T>(fake: unknown, work: () => Promise<T>) {
  const shared = globalThis as unknown as { maths4uDb?: unknown }, previous = shared.maths4uDb;
  shared.maths4uDb = fake;
  try { return await work(); }
  finally { if (previous === undefined) delete shared.maths4uDb; else shared.maths4uDb = previous; }
}

test("registration persists the selected base role and teacher profile in one nested user write", async () => {
  const writes: Prisma.UserCreateArgs[] = [];
  const fake = { course: { findMany: async () => [] }, user: { create: async (args: Prisma.UserCreateArgs) => { writes.push(args); return {}; } } };
  await withFakeDatabase(fake, async () => {
    await register({ ...input, accountType: "TEACHER", roles: ["ADMIN"], teacherAccount: { selfRegistered: false, maxActiveClasses: 999 } });
    await register({ ...input, username: "new_student", roles: ["ADMIN", "TEACHER"] });
  });
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].data.roles, { create: { role: "TEACHER" } });
  assert.deepEqual(writes[0].data.teacherAccount, { create: { selfRegistered: true } });
  assert.deepEqual(writes[1].data.roles, { create: { role: "STUDENT" } });
  assert.equal(writes[1].data.teacherAccount, undefined);
  assert.equal(writes[0].data.subscriptions, undefined);
  assert.equal("grants" in writes[0].data, false);
});

test("class capacity rejects new classes and restorations without deleting retained records", async () => {
  const actor = { id: "teacher", roles: [{ role: "TEACHER" }] } as Actor;
  const classroom = { id: "class", teacherId: actor.id, joinCode: "JOIN-CODE-123", archivedAt: new Date() };
  let changes = 0, locks = 0;
  const tx = {
    $queryRawUnsafe: async () => { locks++; },
    user: { findUniqueOrThrow: async () => ({ roles: actor.roles, teacherAccount: { selfRegistered: true, ...BASIC_TEACHER_LIMITS } }) },
    classroom: { findUnique: async () => classroom, count: async () => 3, create: async () => { changes++; }, update: async () => { changes++; } },
  };
  const fake = { ...tx, $transaction: async (work: (client: unknown) => Promise<unknown>) => work(tx) };
  await withFakeDatabase(fake, async () => {
    await assert.rejects(createClass(actor, { title: "Fourth class" }), /TEACHER_CLASS_LIMIT/);
    await assert.rejects(editClass(actor, classroom.id, { archive: false }), /TEACHER_CLASS_LIMIT/);
  });
  assert.equal(changes, 0);
  assert.equal(locks, 2);
});

test("join capacity rejects a new learner while an existing member remains usable", async () => {
  const activeIds = Array.from({ length: 100 }, (_, i) => "student" + i);
  const classroom = { id: "class", teacherId: "teacher", joinCode: "JOIN-CODE-123", archivedAt: null };
  let joins = 0;
  const tx = {
    $queryRawUnsafe: async () => [],
    user: { findUniqueOrThrow: async () => ({ roles: [{ role: "TEACHER" }], teacherAccount: { selfRegistered: true, ...BASIC_TEACHER_LIMITS } }) },
    classroom: { findUnique: async () => classroom },
    classMembership: { findUnique: async () => null, findMany: async () => activeIds.map(userId => ({ userId })), upsert: async () => { joins++; return {}; } },
  };
  const fake = { $transaction: async (work: (client: unknown) => Promise<unknown>) => work(tx) };
  await withFakeDatabase(fake, async () => {
    await assert.rejects(joinClass({ id: "new-student" } as Actor, { code: classroom.joinCode }), /TEACHER_STUDENT_LIMIT/);
    await joinClass({ id: "student0" } as Actor, { code: classroom.joinCode });
  });
  assert.equal(joins, 1);
});

test("direct paid task assignment requires a grant for self-service teachers while legacy access remains", async () => {
  const legacy = { id: "legacy", roles: [{ role: "TEACHER" }], teacherAccount: null } as Actor;
  const self = { ...legacy, id: "self", teacherAccount: { selfRegistered: true, ...BASIC_TEACHER_LIMITS } } as Actor;
  const task = { id: "paid-task", ownerId: "library-owner", visibility: "PUBLIC", featureKey: "paid_library", versions: [{ id: "version", parts: [] }] };
  const data = workSchema.parse({ title: "Assignment", kind: "HOMEWORK", taskIds: [task.id], opensAt: new Date(0), dueAt: new Date(86400000) });
  let granted = false, created = 0;
  const tx = { task: { count: async () => 0, findMany: async () => [task] }, work: { create: async () => { created++; return {}; } } };
  const fake = { subscription: { findMany: async () => granted ? [{ plan: { features: [{ usageLimit: null }] } }] : [] } };
  await withFakeDatabase(fake, async () => {
    await assert.rejects(createWork(tx as unknown as Prisma.TransactionClient, self, data), /SUBSCRIPTION_REQUIRED/);
    assert.equal(created, 0);
    await createWork(tx as unknown as Prisma.TransactionClient, legacy, data);
    granted = true;
    await createWork(tx as unknown as Prisma.TransactionClient, self, data);
  });
  assert.equal(created, 2);
});
