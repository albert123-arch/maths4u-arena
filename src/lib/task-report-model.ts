import { z } from "zod";
import { restrictedMaterial } from "./content-access";

export const taskReportCategories = ["QUESTION", "ANSWER", "SOLUTION", "DIAGRAM", "FORMATTING", "OTHER"] as const;
export const taskReportStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
export type TaskReportCategory = typeof taskReportCategories[number];
export type TaskReportStatus = typeof taskReportStatuses[number];

const recordId = z.string().trim().min(1).max(191).regex(/^[a-zA-Z0-9_-]+$/);
const plainText = z.string().trim().max(4000).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "Invalid control character");
export const taskReportSchema = z.object({
  taskVersionId: recordId,
  category: z.enum(taskReportCategories),
  message: plainText.refine(value => value.length >= 5, "Please describe the error"),
  requestKey: z.uuid().transform(value => value.toLowerCase()),
  attemptId: recordId.optional(),
}).strict();
export const taskReportQuerySchema = z.object({
  status: z.enum(["", ...taskReportStatuses]).default(""),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().refine(value => value === 25 || value === 50, "Invalid page size").default(25),
}).strict();
export const taskReportChangeSchema = z.object({
  status: z.enum(taskReportStatuses),
  resolution: plainText.default(""),
  revision: z.number().int().min(0),
}).strict();
export type TaskReportInput = z.infer<typeof taskReportSchema>;
export type TaskReportQuery = z.infer<typeof taskReportQuerySchema>;
export type TaskReportChange = z.infer<typeof taskReportChangeSchema>;

export const taskReportLimits = { perHour: 10, perDay: 50 } as const;
type ExistingSubmission = Pick<TaskReportInput, "taskVersionId" | "category" | "message"> & { attemptId: string | null };
export function taskReportSubmissionDecision(existing: ExistingSubmission | null, input: TaskReportInput, usage = { hour: 0, day: 0 }) {
  // A retry represents the original write, regardless of the current quota.
  if (existing) return existing.taskVersionId === input.taskVersionId && existing.category === input.category &&
    existing.message === input.message && existing.attemptId === (input.attemptId ?? null) ? "DEDUPLICATED" : "REQUEST_KEY_REUSED";
  return usage.hour >= taskReportLimits.perHour || usage.day >= taskReportLimits.perDay ? "RATE_LIMITED" : "CREATE";
}

export type ReportActor = { id: string; admin: boolean; teacher: boolean };
export type ReportTask = Omit<Parameters<typeof restrictedMaterial>[0], "versions"> & {
  archivedAt: Date | null;
  visibility: string;
  ownerId: string;
  featureKey: string | null;
  versions: { id: string; number: number; examBoard: string | null; source: { name: string } | null }[];
};
export function taskReportMaterialAllowed(actor: ReportActor, task: ReportTask) {
  // Reuse the bank's complete historical-version/UNKNOWN archive guard.
  return actor.admin || !restrictedMaterial(task);
}
export function canReportCatalogVersion(actor: ReportActor, task: ReportTask, taskVersionId: string, featureAllowed: boolean) {
  if (!taskReportMaterialAllowed(actor, task)) return false;
  if (actor.admin) return true;
  const latest = task.versions.reduce<ReportTask["versions"][number] | null>((last, version) => !last || version.number > last.number ? version : last, null);
  return !task.archivedAt && latest?.id === taskVersionId &&
    (task.visibility === "PUBLIC" || actor.teacher && task.ownerId === actor.id) &&
    (actor.teacher && task.ownerId === actor.id || !task.featureKey || featureAllowed);
}

export function isReportableIndependentPractice(work: { kind: string; ownerId: string; classId: string | null; round: unknown | null }, studentId: string) {
  // Mentoring grants access to a student's own independent practice; it never
  // substitutes for ownership of a teacher's private assignment or competition.
  return work.kind === "PRACTICE" && work.ownerId === studentId && !work.classId && !work.round;
}

export type TaskReportPerson = { id: string; username: string; displayName: string };
export type TaskReportDto = {
  id: string; taskId: string; taskVersionId: string; versionNumber: number; taskTitle: string; sourceUid: string | null;
  category: TaskReportCategory; message: string; status: TaskReportStatus; revision: number; resolution: string;
  createdAt: string; updatedAt: string; reviewedAt: string | null;
  reporter: TaskReportPerson; reviewer: TaskReportPerson | null;
};
export type TaskReportListDto = { items: TaskReportDto[]; total: number; page: number; pageSize: number; pages: number; counts: Record<TaskReportStatus, number> };
export type TaskReportDetailDto = TaskReportDto & { context: {
  statementHtml: string;
  parts: { id: string; label: string; kind: string; statementHtml: string; maxPoints: number;
    options: { id: string; text: string; correct?: boolean }[] }[];
  assets: { id: string; caption: string; mimeType: string; role: string; partPosition: number | null }[];
  answerHtml: string; solutionHtml: string;
} };
