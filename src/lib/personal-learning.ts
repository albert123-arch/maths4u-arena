import { z } from "zod";
import { ensure } from "./errors";
import { type Actor, isAdmin, lockUser, transaction } from "./security";
import { taskPermission } from "./catalog";

// Explicit desired state makes retries safe; neither endpoint accepts a user ID.
export async function bookmarkTask(actor: Actor, taskId: string, input: unknown) {
  const { selected } = z.object({ selected: z.boolean() }).parse(input);
  const permission = await taskPermission(actor);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    if (selected) {
      ensure(await tx.task.findFirst({ where: { AND: [permission, { id: taskId }] }, select: { id: true } }), 404, "NOT_FOUND");
      await tx.taskBookmark.upsert({ where: { userId_taskId: { userId: actor.id, taskId } }, create: { userId: actor.id, taskId }, update: {} });
    } else await tx.taskBookmark.deleteMany({ where: { userId: actor.id, taskId } });
    return { bookmarked: selected };
  });
}

export async function followCourse(actor: Actor, courseId: string, input: unknown) {
  const { selected } = z.object({ selected: z.boolean() }).parse(input);
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    if (selected) {
      ensure(await tx.course.findFirst({ where: { id: courseId, archivedAt: null, ...(isAdmin(actor) ? {} : { published: true }) }, select: { id: true } }), 404, "NOT_FOUND");
      await tx.courseFollow.upsert({ where: { userId_courseId: { userId: actor.id, courseId } }, create: { userId: actor.id, courseId }, update: {} });
    } else await tx.courseFollow.deleteMany({ where: { userId: actor.id, courseId } });
    return { followed: selected };
  });
}
