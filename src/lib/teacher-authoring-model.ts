import { z } from "zod";
import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";
import { taskSchema, renderContent, type TaskInput, type publicVersion } from "./content";

export const authoringStatuses = ["SUBMITTED", "CHANGES_REQUESTED", "REJECTED", "APPROVED", "WITHDRAWN"] as const;
export type AuthoringStatus = typeof authoringStatuses[number];
export const authoringDeclarationVersion = "teacher-original-v1";
export const privateAuthorshipReason = "Teacher-declared private authorship, not publicly reviewed";
export const authoringOriginRule = "teacher-authoring-20261107-v1";
const recordId = z.string().trim().min(1).max(191).regex(/^[a-zA-Z0-9_-]+$/);
const revision = z.number().int().min(0);
const note = z.string().trim().max(4000).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "Invalid control character");
// This is a new first-party identity, never an import editor or a route for
// copying examination metadata into an apparently original record.
export const authoredMaterialSchema = taskSchema.strict().superRefine((material, ctx) => {
  if (material.visibility !== "PRIVATE" || material.featureKey) ctx.addIssue({ code: "custom", message: "Personal tasks must remain private and free of publication features" });
  const provenance = [material.source, material.examBoard, material.year, material.examSession, material.paper,
    material.questionNumber, material.sourceReference, material.sourceUid, material.component, material.seriesCode, material.qualification];
  if (provenance.some(value => typeof value === "string" ? !!value.trim() : value != null)) ctx.addIssue({ code: "custom", message: "Imported or examination provenance is not permitted in first-party authoring" });
  const assets = new Set(material.assets.map(asset => asset.fileId));
  const markup = [...material.texts.flatMap(row => [row.statement, row.answer, row.solution, row.hint, row.markScheme, row.markSchemeText, row.teacherNote]),
    ...material.parts.flatMap(part => [...part.texts.flatMap(row => [row.prompt, row.answer, row.rubric, row.markScheme, row.markSchemeText]), ...part.options.flatMap(option => option.texts.map(row => row.text))])];
  for (const raw of markup) for (const image of findAll(node => node.name === "img", parseDocument(raw ?? "").children)) {
    const fileId = image.attribs.src?.match(/^\/api\/files\/([a-zA-Z0-9_-]+)$/)?.[1];
    if (fileId && !assets.has(fileId)) ctx.addIssue({ code: "custom", message: "Inline files must also be registered as task assets" });
  }
});
const saveFields = {
  material: authoredMaterialSchema,
  declaredOriginal: z.literal(true),
  courseId: recordId.nullish(), topicId: recordId.nullish(),
};
export const createAuthoredTaskSchema = z.object(saveFields).strict();
export const saveAuthoredTaskSchema = z.object({ ...saveFields, revision }).strict();
export const submitAuthoredTaskSchema = z.object({
  revision, taskVersionId: recordId, courseId: recordId, topicId: recordId,
  declaredOriginal: z.literal(true), permissionToPublish: z.literal(true), note: note.default(""),
}).strict();
export const withdrawAuthoredTaskSchema = z.object({ revision, submissionId: recordId, submissionRevision: revision }).strict();
export const decideAuthoredTaskSchema = z.object({
  revision, status: z.enum(["CHANGES_REQUESTED", "REJECTED", "APPROVED"]), feedback: note.default(""),
}).strict().superRefine((value, ctx) => {
  if (value.status !== "APPROVED" && value.feedback.length < 5) ctx.addIssue({ code: "custom", message: "Explain the requested changes or rejection" });
});
export const authoringQuerySchema = z.object({
  status: z.enum(["", ...authoringStatuses]).default(""), q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
}).strict();

function meaningful(raw: string | null | undefined) {
  const html = renderContent(raw ?? "");
  return textContent(parseDocument(html)).replace(/[\s\u00a0\u200b]/g, "").length > 0 || /<img\b/.test(html);
}
// Drafts may be incomplete. Submission requires an answer for every part,
// a worked solution and indicative marking criteria in each offered language.
export function authoringCompleteness(material: TaskInput): string[] {
  const missing: string[] = [];
  for (const task of material.texts) {
    if (!meaningful(task.statement)) missing.push(`${task.locale}:question`);
    if (!meaningful(task.solution)) missing.push(`${task.locale}:solution`);
    for (const [index, part] of material.parts.entries()) {
      const local = part.texts.find(row => row.locale === task.locale);
      if (!local || !meaningful(local.rubric)) missing.push(`${task.locale}:part-${index + 1}:rubric`);
      if (part.kind === "MANUAL" && !meaningful(local?.answer) && !meaningful(task.answer)) missing.push(`${task.locale}:part-${index + 1}:answer`);
      if (part.kind === "SHORT" && !part.acceptedAnswers.some(answer => answer.trim())) missing.push(`${task.locale}:part-${index + 1}:answer`);
      if (part.kind === "NUMERIC" && !Number.isFinite(part.numericAnswer)) missing.push(`${task.locale}:part-${index + 1}:answer`);
      if (part.kind === "CHOICE" && (part.options.filter(option => option.correct).length !== 1 || part.options.some(option => !meaningful(option.texts.find(row => row.locale === task.locale)?.text)))) missing.push(`${task.locale}:part-${index + 1}:answer`);
    }
  }
  return [...new Set(missing)];
}
export function authoringTransitionAllowed(current: AuthoringStatus, next: AuthoringStatus, owner = false) {
  return current === "SUBMITTED" && (owner ? next === "WITHDRAWN" : ["CHANGES_REQUESTED", "REJECTED", "APPROVED"].includes(next));
}
export function authoringRevisionMatches(current: number, expected: number) { return current === expected; }
export type AuthoringPersonDto = { id: string; username: string; displayName: string };
export type AuthoringSubmissionDto = {
  id: string; authoringId: string; taskId: string; taskVersionId: string; versionNumber: number; title: string;
  courseId: string; topicId: string; courseTitle: string; topicTitle: string;
  status: AuthoringStatus; revision: number; note: string; feedback: string;
  authorDeclaration: boolean; permissionToPublish: boolean; declarationVersion: string; contentFingerprint: string;
  submittedAt: string; reviewedAt: string | null; publishedVersionId: string | null;
  owner: AuthoringPersonDto; reviewer: AuthoringPersonDto | null;
};
export type TeacherAuthoredTaskDto = {
  id: string; taskId: string; revision: number; title: string; latestVersionId: string; latestVersionNumber: number;
  status: "DRAFT" | AuthoringStatus; courseId: string | null; topicId: string | null;
  publicTaskId: string | null; publicVersionId: string | null; reviewFeedback: string; updatedAt: string;
  declaredOriginal: true; declarationVersion: string; declaredAt: string; hasUnsubmittedChanges: boolean;
};
export type TeacherAuthoredTaskDetailDto = TeacherAuthoredTaskDto & {
  material: TaskInput; preview: ReturnType<typeof publicVersion>; completeness: string[]; submissions: AuthoringSubmissionDto[];
};
export type AuthoringSubmissionDetailDto = AuthoringSubmissionDto & {
  material: TaskInput; preview: ReturnType<typeof publicVersion>; completeness: string[];
  previews: ReturnType<typeof publicVersion>[]; teacherNotes: { locale: string; html: string }[];
  teacherAssets: { id: string; caption: string; mimeType: string; role: "TEACHER"; partPosition: number | null }[];
  latestPrivateVersionId: string; publicTaskId: string | null;
};
export type AuthoringSubmissionListDto = {
  items: AuthoringSubmissionDto[]; total: number; page: number; pageSize: number; pages: number; counts: Record<AuthoringStatus, number>;
};
