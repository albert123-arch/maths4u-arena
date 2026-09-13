import sanitizeHtml from "sanitize-html";
import katex from "katex";
import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin, isTeacher, teacher, transaction, lockUser } from "./security";
import { hasFeature } from "./subscriptions";
import type { Prisma } from "../generated/prisma/client";

const locale = z.enum(["ru", "en"]);
const text = z.string().max(100000);
const uniqueLocales = <T extends { locale: string }>(rows: T[]) => new Set(rows.map(r => r.locale)).size === rows.length;
const taskText = z.object({ locale, title: z.string().min(1).max(191), statement: text.min(1), hint: text.default(""), solution: text.default(""), teacherNote: text.default("") });
const partText = z.object({ locale, prompt: text.default(""), answer: text.default(""), rubric: text.default("") });
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
  syllabus: z.string().max(50).optional(), examBoard: z.string().max(80).optional(), year: z.number().int().min(1900).max(2200).optional(),
  examSession: z.string().max(50).optional(), paper: z.string().max(50).optional(), questionNumber: z.string().max(50).optional(),
  topicIds: z.array(z.string()).max(20).default([]),
  texts: z.array(taskText).min(1).max(2).refine(uniqueLocales), parts: z.array(part).min(1).max(30),
  assets: z.array(z.object({ fileId: z.string(), role: z.enum(["STATEMENT", "HINT", "SOLUTION", "TEACHER"]), locale: locale.optional(), caption: z.string().max(500).default("") })).max(20).default([]),
});
export type TaskInput = z.infer<typeof taskSchema>;
export const versionInclude = {
  texts: true, source: true, assets: true,
  parts: { orderBy: { position: "asc" }, include: { texts: true, acceptedAnswers: true, options: { orderBy: { position: "asc" }, include: { texts: true } } } },
} satisfies Prisma.TaskVersionInclude;
export type Version = Prisma.TaskVersionGetPayload<{ include: typeof versionInclude }>;
export function localized<T extends { locale: string }>(rows: T[], lang: string): T {
  return rows.find(r => r.locale === lang) ?? rows.find(r => r.locale === "en") ?? rows[0];
}
function decodeMath(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}
export function renderContent(raw: string) {
  return sanitizeHtml(raw, {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "u", "sub", "sup", "ul", "ol", "li", "blockquote", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td", "img"],
    allowedAttributes: { img: ["src", "alt", "width", "height"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: [], allowProtocolRelative: false,
    exclusiveFilter: frame => frame.tag === "img" && !/^\/api\/files\/[a-zA-Z0-9_-]+$/.test(frame.attribs.src || ""),
    textFilter: escaped => escaped.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, (_m, inline, display, double, single) => {
      return katex.renderToString(decodeMath(inline ?? display ?? double ?? single), { displayMode: display !== undefined || double !== undefined, throwOnError: false, trust: false, strict: "ignore", maxExpand: 1000, maxSize: 20 });
    }),
  });
}
export function publicVersion(v: Version, lang: string, solutions = false) {
  const t = localized(v.texts, lang);
  return { id: v.id, taskId: v.taskId, title: t.title, locale: t.locale, statement: renderContent(t.statement),
    ...(solutions ? { hint: renderContent(t.hint), solution: renderContent(t.solution) } : {}),
    source: v.source?.name, syllabus: v.syllabus, year: v.year, examSession: v.examSession, paper: v.paper, questionNumber: v.questionNumber,
    assets: v.assets.filter(a => a.role === "STATEMENT" || (solutions && ["HINT", "SOLUTION"].includes(a.role))).map(a => ({ id: a.fileId, caption: a.caption, role: a.role })),
    parts: v.parts.map(p => {
      const pt = localized(p.texts, lang);
      return { id: p.id, kind: p.kind, maxPoints: p.maxPoints, prompt: renderContent(pt.prompt),
        ...(solutions ? { answer: renderContent(pt.answer), rubric: renderContent(pt.rubric) } : {}),
        options: p.options.map(o => ({ id: o.id, text: renderContent(localized(o.texts, lang).text), ...(solutions ? { correct: o.correct } : {}) })) };
    }) };
}
export async function createTaskVersion(tx: Prisma.TransactionClient, actor: Actor, data: TaskInput, taskId?: string) {
  if (taskId) {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    ensure(task && (task.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  }
  for (const asset of data.assets) {
    const file = await tx.storedFile.findUnique({ where: { id: asset.fileId } });
    ensure(file && (file.ownerId === actor.id || isAdmin(actor)), 400, "INVALID_FILE");
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
    syllabus: data.syllabus, examBoard: data.examBoard, year: data.year, examSession: data.examSession, paper: data.paper, questionNumber: data.questionNumber,
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
export async function editorTask(actor: Actor, id: string) {
  teacher(actor);
  const t = await db().task.findUnique({ where: { id }, include: { topics: true, versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } } });
  ensure(t && (t.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  return t;
}

