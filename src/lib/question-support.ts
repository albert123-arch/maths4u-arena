import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import type { Actor } from "./security";
import { taskPermission } from "./catalog";
import { publicVersion, versionInclude } from "./content";
import { beginStudy, revealStudyHelp, selfCheckStudy } from "./study";
import { quadraticTopic, quadraticTopics, type QuadraticTopic } from "./square-model";
import { questionsForTopic, squareHelp, squareMarkingRows } from "./square-content";
import { squareMappings } from "./square-learning";
import type { SupportContent } from "./question-support-model";
import { materialGrant } from "./material-grant";
import { rolePreview } from "./request-view";

const access = z.enum(["attempt", "stuck", "paper"]);
async function readable(actor: Actor | null, id: string) {
  const task = await db().task.findFirst({ where: { AND: [{ id }, await taskPermission(actor)] }, include: { versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } });
  ensure(task?.versions[0], 404, "NOT_FOUND"); return task.versions[0];
}
export async function catalogSupport(actor: Actor | null, id: string, input: unknown, lang: string): Promise<SupportContent> {
  const data = z.object({ kind: z.enum(["hint", "solution", "guidance"]), access: access.optional(), lessonId: z.string().optional() }).strict().parse(input);
  const v = await readable(actor, id), manual = v.parts.some(p => p.kind === "MANUAL");
  ensure(data.kind === "hint" || data.access, 403, "CHECK_ANSWER_FIRST");
  const existing = actor ? await db().practiceStudy.findFirst({ where: { taskId: id, attempt: { userId: actor.id, ...(data.access === "attempt" ? { status: { not: "IN_PROGRESS" as const } } : {}), workVersion: { items: { some: { taskVersionId: v.id } } } } }, orderBy: { updatedAt: "desc" }, select: { attemptId: true } }) : null;
  if (data.kind !== "hint" && data.access === "attempt" && !rolePreview()) ensure(existing, 403, "CHECK_ANSWER_FIRST");
  ensure(data.access !== "paper" || manual, 400, "INVALID_INPUT");
  if (actor && !rolePreview() && !v.task.examArchivedAt) {
    const study = existing ? { id: existing.attemptId } : await beginStudy(actor, { taskId: id, lessonId: data.lessonId }, lang);
    if (data.kind !== "guidance" || data.access !== "paper") {
      const kind = data.kind === "guidance" ? "markScheme" : data.kind;
      // An absent optional hint is still a usable, empty panel.
      const text = v.texts.find(t => t.locale === lang) ?? v.texts[0];
      if (data.kind !== "hint" || text.hint || v.assets.some(a => a.role === "HINT")) await revealStudyHelp(actor, study.id, { kind }, lang);
    }
  }
  const topic = quadraticTopics.find(t => questionsForTopic(t.key).some(q => q.id === v.sourceUid));
  if (topic) {
    ensure((await squareMappings(topic.key)).get(v.sourceUid!) === v.id, 409, "QUESTION_CHANGED");
    const q = questionsForTopic(topic.key).find(q => q.id === v.sourceUid)!;
    return data.kind === "guidance" ? { rows: squareMarkingRows(q), total: q.marks } : { html: squareHelp(q, data.kind) };
  }
  const reveal = { hint: data.kind === "hint", answer: data.kind === "solution", solution: data.kind === "solution", markScheme: data.kind === "guidance" };
  const shown = publicVersion(v, lang, true, reveal);
  let html = data.kind === "hint" ? shown.hint : data.kind === "solution" ? (shown.answer ?? "") + (shown.solution ?? "") + shown.parts.map(p => p.answer ?? "").join("")
    : (shown.markSchemeText || shown.markScheme || "") + shown.parts.map(p => p.markSchemeText || p.markScheme || p.rubric || "").join("");
  const role = data.kind === "guidance" ? "MARK_SCHEME" : data.kind === "hint" ? "HINT" : "SOLUTION";
  const eligible=(value:string)=>value===role||(data.kind==='solution'&&value==='ANSWER');
  const grants=new Map(v.assets.filter(a=>eligible(a.role)&&(!a.locale||a.locale===shown.locale)).map(a=>[a.fileId,materialGrant({fileId:a.fileId,versionId:v.id,role:a.role,actorId:actor?.id??null})]));
  // Legacy scans can be embedded in the HTML, so they are deliberately absent
  // from shown.assets (to avoid duplicate images). Grant those exact URLs too.
  html=html?.replace(/\b(src|href)=(['"])(\/api\/files\/([\w-]+)(?:\?[^'"]*)?)\2/g,(all,attribute,quote,url,id)=>{
    const token=grants.get(id);if(!token)return all;
    const target=new URL(url.replaceAll('&amp;','&'),'http://material.local');target.searchParams.set('support',token);
    return attribute+'='+quote+(target.pathname+target.search).replaceAll('&','&amp;')+quote;
  });
  const caption=lang==='ru'?'Критерии оценивания':'Marking guidance';
  if(data.kind==='guidance')html=html?.replace(/<img\b[^>]*>/g,tag=>/\/api\/files\/[\w-]+\?[^"']*support=/.test(tag)?tag.replace(/\balt=(['"])[^'"]*\1/,'alt="'+caption+'"'):tag);
  const assets=[...new Map(v.assets.filter(a=>grants.has(a.fileId)).map(a=>[a.fileId,{id:a.fileId,mimeType:a.file.mimeType,caption:data.kind==='guidance'?caption:a.caption,accessToken:grants.get(a.fileId),embedded:!!html?.includes('/api/files/'+a.fileId+'?')}])).values()];
  return { html, total: v.parts.reduce((n, p) => n + p.maxPoints, 0), assets };
}
export async function saveSelfMarks(actor: Actor | null, id: string, input: unknown, lang: string) {
  ensure(actor, 401, "LOGIN_REQUIRED");
  const data = z.object({ points: z.number().int().min(0), lessonId: z.string().optional() }).strict().parse(input);
  const v = await readable(actor, id);ensure(!v.task.examArchivedAt,410,"MATERIAL_UNAVAILABLE");ensure(v.parts.some(p => p.kind === "MANUAL"), 400, "INVALID_INPUT");
  ensure(data.points <= v.parts.reduce((n, p) => n + p.maxPoints, 0), 400, "INVALID_POINTS");
  const study = await beginStudy(actor, { taskId: id, lessonId: data.lessonId }, lang);
  // A self-awarded total never becomes an independent-check or teacher grade.
  await selfCheckStudy(actor, study.id, { state: "SELF_CHECKED", solved: false, points: data.points });
  return { selfPoints: data.points, selfAssessed: true };
}
export async function squareSelfMarks(actor: Actor | null, input: unknown, topic: QuadraticTopic = quadraticTopic()) {
  const data = z.object({ uid: z.string(), version: z.literal(topic.version), points: z.number().int().min(0) }).strict().parse(input);
  const id = (await squareMappings(topic.key)).get(data.uid);ensure(id, 404, "NOT_FOUND");
  const version = await db().taskVersion.findUniqueOrThrow({ where: { id }, select: { taskId: true } });
  return saveSelfMarks(actor, version.taskId, { points: data.points, lessonId: topic.lessonId }, "en");
}
