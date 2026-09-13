import { z } from "zod";
import { db } from "./prisma";
import { taskSchema, createTaskVersion, type TaskInput } from "./content";
import { type Actor, admin, digest, transaction, lockUser } from "./security";
import { ensure } from "./errors";

// File exports only. This module never connects to a legacy database.
const record = z.record(z.string(), z.unknown());
export const importSchema = z.object({ project: z.enum(["maths4u", "olymp", "arena"]), records: z.array(record).min(1).max(100) });
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
function normalize(project: string, row: Record<string, unknown>): TaskInput {
  if (row.material) return taskSchema.parse(row.material);
  if (project === "arena") {
    const rules = typeof row.gradingRulesJson === "string" ? JSON.parse(row.gradingRulesJson) : (row.gradingRules ?? {});
    const numeric = row.gradingType === "NUMERIC_TOLERANCE";
    const accepted = typeof rules.answer === "string" ? [rules.answer] : Array.isArray(rules.answers) ? rules.answers : [];
    return taskSchema.parse({ visibility: "PRIVATE", source: "Arena", difficulty: Number(row.difficulty ?? 1),
      texts: [{ locale: row.locale === "ru" ? "ru" : "en", title: str(row.title, "Arena"), statement: str(row.prompt), solution: str(row.explanation) }],
      parts: [{ kind: numeric ? "NUMERIC" : accepted.length ? "SHORT" : "MANUAL", maxPoints: Number(row.points ?? 1),
        numericAnswer: numeric ? Number(rules.answer) : undefined, tolerance: Number(rules.tolerance ?? 0), acceptedAnswers: accepted,
        texts: [{ locale: row.locale === "ru" ? "ru" : "en", answer: String(rules.answer ?? ""), rubric: "" }] }],
    });
  }
  if (project === "olymp") {
    const texts = z.array(record).min(1).max(2).parse(row.texts);
    return taskSchema.parse({ visibility: "PRIVATE", difficulty: Number(row.difficulty ?? 1), source: str(row.source_name, "Olymp / Number Theory"),
      year: row.source_year ? Number(row.source_year) : undefined, questionNumber: str(row.problem_code, String(row.id)),
      texts: texts.map(t => ({ locale: t.lang, title: str(t.title, str(row.problem_code, "Olympiad")), statement: str(t.statement_html), hint: str(t.hint_html),
        solution: str(t.solution_html), teacherNote: str(t.teacher_note_html) })),
      parts: [{ kind: "MANUAL", maxPoints: Number(row.marks ?? 7), texts: texts.map(t => ({ locale: t.lang, rubric: str(t.rubric), answer: str(t.answer) })) }],
    });
  }
  return taskSchema.parse({ visibility: "PRIVATE", source: str(row.exam_board, "Maths4U archive"), syllabus: row.syllabus, examBoard: row.exam_board,
    year: row.exam_year ? Number(row.exam_year) : undefined, examSession: row.exam_session, paper: row.component, questionNumber: row.question_no,
    texts: [{ locale: "en", title: str(row.title, "Exam question"), statement: str(row.body_html), solution: str(row.solution_html), markScheme: str(row.mark_scheme), markSchemeSource: str(row.mark_scheme_source) }],
    parts: [{ kind: "MANUAL", maxPoints: Number(row.marks ?? 5), texts: [{ locale: "en", rubric: str(row.rubric) }] }],
  });
}
export async function importMaterials(actor: Actor, input: unknown) {
  admin(actor);
  const data = importSchema.parse(input);
  const normalized = data.records.map(row => {
    const legacyId = String(row.id ?? "");
    ensure(legacyId.length > 0 && legacyId.length <= 191, 400, "LEGACY_ID_REQUIRED");
    return { legacyId, material: normalize(data.project, row) };
  });
  ensure(new Set(normalized.map(r => r.legacyId)).size === normalized.length, 400, "DUPLICATE_LEGACY_ID");
  return transaction(async tx => {
    await lockUser(tx, actor.id);
    let created = 0, updated = 0, skipped = 0;
    for (const row of normalized) {
      const contentHash = digest(JSON.stringify(row.material));
      const key = { sourceProject: data.project, legacyId: row.legacyId };
      const existing = await tx.importRecord.findUnique({ where: { sourceProject_legacyId: key } });
      // Course-bound pilot records have a source-verified version correction path.
      // Generic exports must never erase their order, publication or split MS.
      if (existing) ensure(!await tx.lessonTask.count({ where: { taskId: existing.taskId, lessonId: { startsWith: "pilot_" } } }), 409, "PILOT_USE_CORRECTION_ROUTE");
      if (existing?.contentHash === contentHash) { skipped++; continue; }
      const v = await createTaskVersion(tx, actor, row.material, existing?.taskId);
      await tx.importRecord.upsert({ where: { sourceProject_legacyId: key }, create: { ...key, taskId: v.taskId, contentHash },
        update: { contentHash, importedAt: new Date() } });
      if (existing) updated++; else created++;
    }
    await tx.auditEvent.create({ data: { actorId: actor.id, action: "MATERIALS_IMPORTED", targetId: data.project } });
    return { created, updated, skipped };
  });
}
export async function importStatus(actor: Actor) {
  admin(actor);
  return db().importRecord.findMany({ take: 100, orderBy: { importedAt: "desc" }, select: { sourceProject: true, legacyId: true, taskId: true, importedAt: true } });
}
