import sanitizeHtml from "sanitize-html";
import katex from "katex";
import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin, isTeacher, teacher, transaction, lockUser } from "./security";
import { hasFeature } from "./subscriptions";
import type { Prisma } from "../generated/prisma/client";
import { mathPattern, protectMathHtml } from "./math-markup.mjs";
import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";

const locale = z.enum(["ru", "en"]);
const text = z.string().max(100000);
const uniqueLocales = <T extends { locale: string }>(rows: T[]) => new Set(rows.map(r => r.locale)).size === rows.length;
const transcription = { markSchemeText: text.nullish(), markSchemeStatus: z.enum(["NONE", "SOURCE_TEXT", "OCR_UNVERIFIED", "DRAFT", "VERIFIED"]).optional() };
const taskText = z.object({ locale, title: z.string().min(1).max(191), statement: text.min(1), answer: text.nullish(), hint: text.default(""), solution: text.default(""), markScheme: text.default(""), markSchemeSource: z.string().max(500).default(""), ...transcription, teacherNote: text.default("") });
const partText = z.object({ locale, prompt: text.default(""), answer: text.default(""), rubric: text.default(""), markScheme: text.nullish(), markSchemeSource: z.string().max(500).nullish(), ...transcription });
const option = z.object({ correct: z.boolean(), texts: z.array(z.object({ locale, text: z.string().min(1).max(5000) })).min(1).max(2).refine(uniqueLocales) });
const part = z.object({
  kind: z.enum(["SHORT", "NUMERIC", "CHOICE", "MANUAL"]), maxPoints: z.number().positive().max(100),
  caseSensitive: z.boolean().default(false), numericAnswer: z.number().finite().optional(),
  tolerance: z.number().min(0).max(1000000).default(0), acceptedAnswers: z.array(z.string().min(1).max(1000)).max(30).default([]),
  texts: z.array(partText).min(1).max(2).refine(uniqueLocales), options: z.array(option).max(20).default([]),
}).superRefine((p, ctx) => {
  if (p.kind === "NUMERIC" && p.numericAnswer === undefined) ctx.addIssue({ code: "custom", message: "Numeric answer required" });
  if (p.kind === "SHORT" && !p.acceptedAnswers.length) ctx.addIssue({ code: "custom", message: "Accepted answers required" });
  if (p.kind === "CHOICE" && (p.options.length < 2 || p.options.filter(o => o.correct).length !== 1)) ctx.addIssue({ code: "custom", message: "Exactly one correct option required" });
});
export const taskSchema = z.object({
  visibility: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"), featureKey: z.string().max(100).nullable().default(null),
  difficulty: z.number().int().min(1).max(5).default(1), source: z.string().max(191).optional(),
  difficultyKnown: z.boolean().default(false), materialCategory: z.enum(["UNKNOWN", "EXAM", "TRAINING", "OLYMPIAD"]).default("UNKNOWN"),
  syllabus: z.string().max(50).optional(), examBoard: z.string().max(80).optional(), year: z.number().int().min(1900).max(2200).optional(),
  examSession: z.string().max(50).optional(), paper: z.string().max(50).optional(), questionNumber: z.string().max(50).optional(),
  sourceReference: z.string().max(500).optional(), sourceUid: z.string().max(191).optional(), component: z.string().max(50).optional(), seriesCode: z.string().max(50).optional(), qualification: z.string().max(191).optional(),
  topicIds: z.array(z.string()).max(20).default([]),
  texts: z.array(taskText).min(1).max(2).refine(uniqueLocales), parts: z.array(part).min(1).max(30),
  assets: z.array(z.object({ fileId: z.string(), role: z.enum(["STATEMENT", "ANSWER", "HINT", "SOLUTION", "MARK_SCHEME", "TEACHER"]), locale: locale.optional(), caption: z.string().max(500).default(""), partPosition: z.number().int().min(0).max(29).nullable().optional() })).max(20).default([]),
}).superRefine((v, ctx) => {
  if(v.assets.some(a => a.partPosition != null && a.partPosition >= v.parts.length)) ctx.addIssue({code:"custom", message:"Unknown asset part"});
  for(const t of [...v.texts, ...v.parts.flatMap(p=>p.texts)]) if(t.markSchemeStatus && t.markSchemeStatus !== "NONE" && !t.markSchemeText?.trim()) ctx.addIssue({code:"custom",message:"Transcription status requires text"});
});
export type TaskInput = z.infer<typeof taskSchema>;
export const versionInclude = {
  texts: true, source: true, assets: { include: { file: { select: { mimeType: true } } } },
  parts: { orderBy: { position: "asc" }, include: { texts: true, acceptedAnswers: true, options: { orderBy: { position: "asc" }, include: { texts: true } } } },
} satisfies Prisma.TaskVersionInclude;
export type Version = Prisma.TaskVersionGetPayload<{ include: typeof versionInclude }>;
export function localized<T extends { locale: string }>(rows: T[], lang: string): T {
  return rows.find(r => r.locale === lang) ?? rows.find(r => r.locale === "en") ?? rows[0];
}
export function renderContent(raw: string, anonymousImages = false) {
  // HTML parsers emit separate text chunks around entities. Extract complete
  // expressions first so an inequality cannot split a matrix or cases block.
  let prefix="MATHS4UFORMULA";while(raw.includes(prefix))prefix+="X";
  const formulas:string[]=[];
  const protectedHtml:string=protectMathHtml(raw);
  const prepared=protectedHtml.replace(mathPattern,(_m,inline,display,double,single)=>{
    const value=textContent(parseDocument(inline??display??double??single));
    const rendered=katex.renderToString(value,{displayMode:display!==undefined||double!==undefined,throwOnError:false,trust:false,strict:"ignore",maxExpand:1000,maxSize:20});
    return prefix+(formulas.push(rendered)-1)+"END";
  });
  const html=sanitizeHtml(prepared, {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "sub", "sup", "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td", "img"],
    allowedAttributes: { img: ["src", "alt", "width", "height"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: [], allowProtocolRelative: false,
    // Imported alt text may contain the paper/session reference. Keep the image,
    // dimensions and mathematical content, but omit that description in a live assessment.
    ...(anonymousImages ? { transformTags: { img: (tagName: string, attribs: Record<string, string>) => ({ tagName, attribs: { ...attribs, alt: "" } }) } } : {}),
    exclusiveFilter: frame => frame.tag === "img" && !/^\/api\/files\/[a-zA-Z0-9_-]+$/.test(frame.attribs.src || ""),
    textFilter: escaped=>escaped.replace(new RegExp(prefix+"(\\d+)END","g"),(_m,index)=>formulas[Number(index)]??""),
  });
  return html;
}
export type HelpVisibility = { hint: boolean; answer: boolean; solution: boolean; markScheme: boolean };
export function availableHelp(v: Version, lang: string): HelpVisibility {
  const t = localized(v.texts, lang);
  const asset = (role: string) => v.assets.some(a => a.role === role && (!a.locale || a.locale === t.locale));
  return { hint: !!t.hint || asset("HINT"), solution: !!t.solution || asset("SOLUTION"),
    markScheme: !!t.markScheme || !!t.markSchemeText || asset("MARK_SCHEME") || v.parts.some(p => {const t=localized(p.texts,lang);return !!t.rubric || !!t.markScheme || !!t.markSchemeText;}),
    answer: !!t.answer || asset("ANSWER") || v.parts.some(p => !!localized(p.texts, lang).answer || p.options.some(o => o.correct) || p.kind === "NUMERIC" || p.acceptedAnswers.length > 0) };
}
export function publicVersion(v: Version, lang: string, solutions = false, revealed?: HelpVisibility, anonymousTitle?: string) {
  const t = localized(v.texts, lang);
  const render = (raw: string) => renderContent(raw, anonymousTitle !== undefined);
  const show = (key: keyof HelpVisibility) => solutions && (!revealed || revealed[key]);
  const whole = (html:string|null) => {let result=protectMathHtml(html??"");const doc=parseDocument(result,{withStartIndices:true,withEndIndices:true});
    for(const n of findAll(n=>n.name==="img"&&v.assets.some(a=>a.partPosition!=null&&n.attribs.src==="/api/files/"+a.fileId),doc.children).reverse())result=result.slice(0,n.startIndex!)+result.slice(n.endIndex!+1);return result;};
  const visibleHtml = [t.statement, ...(show("answer") ? [whole(t.answer)] : []), ...(show("hint") ? [t.hint] : []), ...(show("solution") ? [whole(t.solution)] : []), ...(show("markScheme") ? [whole(t.markScheme)] : [])].join("\n");
  return { id: v.id, title: anonymousTitle ?? t.title, locale: t.locale, statement: render(t.statement),
    ...(show("hint") ? { hint: render(t.hint) } : {}), ...(show("solution") ? { solution: render(whole(t.solution)) } : {}),
    ...(show("answer") ? {answer:render(whole(t.answer))} : {}),
    ...(show("markScheme") ? { markScheme: render(whole(t.markScheme)), markSchemeSource: anonymousTitle === undefined ? t.markSchemeSource : undefined, markSchemeText: render(t.markSchemeText ?? ""), markSchemeStatus:t.markSchemeStatus } : {}),
    // Keep all source metadata inside this boundary: hiding it only in JSX still
    // exposes the exam reference in GET, autosave and submit responses.
    ...(anonymousTitle === undefined ? { taskId: v.taskId, source: v.source?.name, syllabus: v.syllabus, year: v.year, examSession: v.examSession, paper: v.paper, questionNumber: v.questionNumber } : {}),
    assets: v.assets.filter(a => (!a.locale || a.locale === t.locale) && (a.role === "STATEMENT" || (a.role === "ANSWER" && show("answer")) || (a.role === "HINT" && show("hint")) || (a.role === "SOLUTION" && show("solution")) || (a.role === "MARK_SCHEME" && show("markScheme")))
      && !(a.file.mimeType.startsWith("image/") && ["\"", "'"].some(q => visibleHtml.includes(`src=${q}/api/files/${a.fileId}${q}`))))
      .map((a, index) => ({ id: a.fileId, caption: anonymousTitle === undefined ? a.caption : (lang === "en" ? "Question attachment " : "Вложение к условию ") + (index + 1), role: a.role, mimeType: a.file.mimeType, partPosition:a.partPosition })),
    parts: v.parts.map(p => {
      const pt = localized(p.texts, lang);
      const plainAnswer = p.kind === "NUMERIC" ? String(p.numericAnswer) : p.acceptedAnswers.map(a => a.value).join(" / ");
      const answer = pt.answer || plainAnswer.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return { id: p.id, kind: p.kind, maxPoints: p.maxPoints, prompt: render(pt.prompt),
        ...(show("answer") ? { answer: render(answer) } : {}), ...(show("markScheme") ? { rubric: render(pt.rubric) } : {}),
        ...(show("markScheme") ? {markScheme:render(pt.markScheme ?? ""),markSchemeText:render(pt.markSchemeText ?? ""),markSchemeSource:anonymousTitle === undefined ? pt.markSchemeSource : undefined,markSchemeStatus:pt.markSchemeStatus} : {}),
        options: p.options.map(o => ({ id: o.id, text: render(localized(o.texts, lang).text), ...(show("answer") ? { correct: o.correct } : {}) })) };
    }) };
}
export async function createTaskVersion(tx: Prisma.TransactionClient, actor: Actor, data: TaskInput, taskId?: string) {
  if (taskId) {
    await tx.$queryRaw`SELECT id FROM Task WHERE id = ${taskId} FOR UPDATE`;
    const task = await tx.task.findUnique({ where: { id: taskId } });
    ensure(task && (task.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  }
  for (const asset of data.assets) {
    const file = await tx.storedFile.findUnique({ where: { id: asset.fileId } });
    ensure(file && !file.deletedAt && (file.ownerId === actor.id || isAdmin(actor)), 400, "INVALID_FILE");
    ensure(!await tx.answerFile.findUnique({ where: { fileId: asset.fileId } }), 400, "SUBMISSION_FILE_IS_PRIVATE");
  }
  const source = data.source ? await tx.source.upsert({ where: { name: data.source }, create: { name: data.source }, update: {} }) : null;
  const task = taskId ? await tx.task.update({ where: { id: taskId }, data: { visibility: data.visibility, featureKey: data.featureKey } })
    : await tx.task.create({ data: { ownerId: actor.id, visibility: data.visibility, featureKey: data.featureKey } });
  const last = await tx.taskVersion.aggregate({ where: { taskId: task.id }, _max: { number: true } });
  await tx.taskTopic.deleteMany({ where: { taskId: task.id } });
  await tx.taskTopic.createMany({ data: [...new Set(data.topicIds)].map(topicId => ({ taskId: task.id, topicId })) });
  return tx.taskVersion.create({ data: {
    taskId: task.id, number: (last._max.number ?? 0) + 1, difficulty: data.difficulty, sourceId: source?.id,
    difficultyKnown: data.difficultyKnown, materialCategory: data.materialCategory,
    syllabus: data.syllabus, examBoard: data.examBoard, year: data.year, examSession: data.examSession, paper: data.paper, questionNumber: data.questionNumber,
    sourceReference:data.sourceReference, sourceUid:data.sourceUid, component:data.component, seriesCode:data.seriesCode, qualification:data.qualification,
    texts: { create: data.texts }, assets: { create: data.assets },
    parts: { create: data.parts.map((p, position) => ({ position, kind: p.kind, maxPoints: p.maxPoints, caseSensitive: p.caseSensitive,
      numericAnswer: p.numericAnswer, tolerance: p.tolerance, texts: { create: p.texts }, acceptedAnswers: { create: p.acceptedAnswers.map(value => ({ value })) },
      options: { create: p.options.map((o, position) => ({ position, correct: o.correct, texts: { create: o.texts } })) } })) },
  }, include: versionInclude });
}
export async function saveTask(actor: Actor, input: unknown, taskId?: string) {
  teacher(actor);
  const data = taskSchema.parse(input);
  // Library publication and paid content are centrally moderated.
  if (!isAdmin(actor)) ensure(data.visibility === "PRIVATE" && !data.featureKey, 403, "ADMIN_PUBLICATION_REQUIRED");
  return transaction(async tx => { await lockUser(tx, actor.id); return createTaskVersion(tx, actor, data, taskId); });
}
export async function library(actor: Actor | null, lang: string, query = "") {
  const rows = await db().task.findMany({ where: { archivedAt: null,
    OR: [{ visibility: "PUBLIC" }, ...(actor && isTeacher(actor) ? [{ ownerId: actor.id }, ...(isAdmin(actor) ? [{}] : [])] : [])],
    versions: query ? { some: { texts: { some: { title: { contains: query } } } } } : undefined,
  }, take: 100, orderBy: { createdAt: "desc" }, include: { versions: { orderBy: { number: "desc" }, take: 1, include: versionInclude }, topics: { include: { topic: { include: { texts: true } } } } } });
  return Promise.all(rows.map(async t => {
    const allowed = (actor && isTeacher(actor)) || !t.featureKey || (actor && await hasFeature(actor, t.featureKey));
    const v = t.versions[0];
    return { id: t.id, title: localized(v.texts, lang).title, locked: !allowed, featureKey: t.featureKey,
      editable: !!actor && (isAdmin(actor) || t.ownerId === actor.id),
      topics: t.topics.map(x => localized(x.topic.texts, lang).title), version: allowed ? publicVersion(v, lang) : null };
  }));
}
export function editableVersion(v: Version) {
  return { difficulty: v.difficulty, difficultyKnown: v.difficultyKnown, materialCategory: v.materialCategory, source: v.source?.name, syllabus: v.syllabus ?? undefined, examBoard: v.examBoard ?? undefined, year: v.year ?? undefined,
    examSession: v.examSession ?? undefined, paper: v.paper ?? undefined, questionNumber: v.questionNumber ?? undefined,
    sourceReference:v.sourceReference ?? undefined, sourceUid:v.sourceUid ?? undefined, component:v.component ?? undefined, seriesCode:v.seriesCode ?? undefined, qualification:v.qualification ?? undefined,
    texts: v.texts.map(t => ({ ...t, answer:t.answer ?? "", markScheme: t.markScheme ?? "", markSchemeSource: t.markSchemeSource ?? "",markSchemeText:t.markSchemeText ?? "" })),
    assets: v.assets.map(a => ({ fileId: a.fileId, locale: a.locale ?? undefined, role: a.role, caption: a.caption,partPosition:a.partPosition })),
    parts: v.parts.map(p => ({ ...p, texts:p.texts.map(t=>({...t,markScheme:t.markScheme ?? "",markSchemeSource:t.markSchemeSource ?? "",markSchemeText:t.markSchemeText ?? ""})), numericAnswer: p.numericAnswer ?? undefined, acceptedAnswers: p.acceptedAnswers.map(a => a.value), options: p.options.map(o => ({ correct: o.correct, texts: o.texts })) })) };
}

export async function editorTask(actor: Actor, id: string) {
  teacher(actor);
  const t = await db().task.findUnique({ where: { id }, include: { topics: true, versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } });
  ensure(t && (t.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  return t;
}

export async function exportTask(actor: Actor, id: string) {
  const task = await editorTask(actor,id), version = task.versions[0];
  return { project: "arena", records: [{ id: task.id, version: version.number, material: taskSchema.parse({ ...editableVersion(version), visibility:task.visibility, featureKey:task.featureKey, topicIds:task.topics.map(t=>t.topicId) }) }] };
}
