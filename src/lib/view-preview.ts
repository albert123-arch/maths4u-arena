import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { requestView, rolePreview } from "./request-view";
import { publicVersion, versionInclude } from "./content";
import { automaticPoints, ownWork, responseSchema } from "./works";
import { hiddenMaterial } from "./content-access";
import { taskPermission } from "./catalog";

async function material(kind: string, id: string) {
  const v = requestView(); ensure(v?.real && v.actor && rolePreview(), 403, "VIEW_NOT_ALLOWED");
  if (kind === "works") {
    const work = await ownWork(v.real, id);
    // Admin may inspect user data in USER mode; role preview only ever opens
    // their own assignment, with no access to any student's responses.
    ensure(work.ownerId === v.real.id, 404, "NOT_FOUND");
    const version = await db().workVersion.findFirstOrThrow({ where: { workId: id }, orderBy: { number: "desc" }, include: { items: { orderBy: { position: "asc" }, include: { taskVersion: { include: versionInclude } } } } });
    ensure(!version.items.some(i=>hiddenMaterial(v.actor,i.taskVersion.task)),404,"NOT_FOUND");
    return { title: work.title, versions: version.items.map(i => i.taskVersion) };
  }
  const task = await db().task.findFirst({ where: { AND: [{ id }, await taskPermission(v.actor)] }, include: { versions: { orderBy: { number: "desc" }, take: 1, include: versionInclude } } });
  ensure(task?.versions[0], 404, "NOT_FOUND");
  return { title: "Practice preview", versions: task.versions };
}
export async function previewMaterial(kind: string, id: string, lang: string) {
  const value = await material(kind, id);
  return { title: value.title, questions: value.versions.map(v => publicVersion(v, lang, false)) };
}
export async function checkPreview(kind: string, id: string, input: unknown, lang: string) {
  const value = await material(kind, id);
  const data = z.object({ answers: z.array(z.object({ partId: z.string(), response: responseSchema }).strict()).max(1500) }).strict().parse(input);
  const parts = value.versions.flatMap(v => v.parts.map(p => ({ part: p, uid: v.sourceUid })));
  ensure(new Set(data.answers.map(a => a.partId)).size === data.answers.length && data.answers.every(a => parts.some(p => p.part.id === a.partId)), 400, "INVALID_INPUT");
  return { saved: false, results: parts.map(({ part, uid }) => ({ partId: part.id, points: automaticPoints(part, data.answers.find(a => a.partId === part.id)?.response ?? { value: "" }, uid), maximum: part.maxPoints })),
    questions: value.versions.map(v => publicVersion(v, lang, true)) };
}
export type PreviewDto = Awaited<ReturnType<typeof previewMaterial>>;
export type PreviewCheckDto = Awaited<ReturnType<typeof checkPreview>>;
