import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { isAdmin, isTeacher, type Actor } from "./security";
import { requestView } from "./request-view";
import { approvedWhere, restrictedMaterial } from "./content-access";
import { taskPermission } from "./catalog";
import { publicVersion, renderContent, versionInclude, type Version } from "./content";
import { contentPackages, packageTopic } from "./content-package-content";
import { questionsForTopic, squareMarkingRows, type SourceQuestion } from "./square-content";
import { quadraticTopics, type QuadraticTopic } from "./square-model";
import { squareMappings, visibleSquareMappings } from "./square-learning";
import { teacherPreviewAssets } from "./teacher-task-preview-assets";
import type { TeacherPreviewResource, TeacherTaskPreviewDto } from "./teacher-task-preview-model";

const recordId = z.string().min(1).max(191).regex(/^[a-zA-Z0-9_-]+$/);
const query = z.object({ versionId: recordId }).strict();
const packageQuery = z.object({ lessonId: recordId, uid: z.string().min(1).max(191), version: z.string().min(1).max(100) }).strict();

function requireTeachingPreview(actor: Actor | null): asserts actor is Actor {
  ensure(actor, 401, "LOGIN_REQUIRED");
  ensure(!requestView()?.lens, 403, "EXIT_VIEW_FIRST");
  ensure(isTeacher(actor), 403, "FORBIDDEN");
}

// The injected readers exist for focused service tests. The HTTP route always
// uses these default readers and their existing catalogue permission boundary.
export type TeacherPreviewReaders = {
  readVersion: (actor: Actor, taskId: string) => Promise<Version | null>;
  sourceQuestion: (version: Version) => Promise<SourceQuestion | null>;
};
const readers: TeacherPreviewReaders = {
  async readVersion(actor, taskId) {
    const task = await db().task.findFirst({
      where: { AND: [{ id: taskId, archivedAt: null, examArchivedAt: null, ...approvedWhere }, await taskPermission(actor)] },
      include: { versions: { take: 1, orderBy: { number: "desc" }, include: versionInclude } },
    });
    return task?.versions[0] ?? null;
  },
  async sourceQuestion(version) {
    const pack = contentPackages.find(candidate => candidate.questions.some(question => question.id === version.sourceUid));
    const packaged = pack?.questions.find(question => question.id === version.sourceUid);
    const topic = pack && packaged ? packageTopic(pack.lessons.find(lesson => lesson.key === packaged.lesson)!.id)
      : quadraticTopics.find(candidate => questionsForTopic(candidate.key).some(question => question.id === version.sourceUid));
    if (!topic) return null;
    // Do not serve different packaged answers under a reused editorial UID.
    ensure((await squareMappings(topic.key)).get(version.sourceUid!) === version.id, 409, "QUESTION_CHANGED");
    return questionsForTopic(topic.key).find(question => question.id === version.sourceUid) ?? null;
  },
};

function partHeading(index: number, count: number) {
  return count > 1 ? `<h4>Part (${String.fromCharCode(97 + index)})</h4>` : "";
}

export function legacyTeacherAnswers(shown: ReturnType<typeof publicVersion>) {
  const whole = shown.answer ?? "";
  const parts = shown.parts.map((part, index) => {
    const choice = part.kind === "CHOICE" ? part.options.flatMap((option, optionIndex) => option.correct
      ? [`<p><strong>Option ${String.fromCharCode(65 + optionIndex)}</strong></p>${option.text}`] : []).join("") : "";
    const answer = part.answer && part.answer.trim() !== whole.trim() ? part.answer : "";
    return answer || choice ? `<section>${partHeading(index, shown.parts.length)}${answer}${choice}</section>` : "";
  }).join("");
  return whole + parts;
}

function legacyTeacherGuidance(shown: ReturnType<typeof publicVersion>) {
  const whole = shown.markScheme || shown.markSchemeText || "";
  return whole + shown.parts.map((part, index) => {
    const html = part.markScheme || part.markSchemeText || part.rubric || "";
    return html && html.trim() !== whole.trim() ? `<section>${partHeading(index, shown.parts.length)}${html}</section>` : "";
  }).join("");
}

export function projectTeacherTaskPreview(version: Version, actor: Actor, lang: string, source: SourceQuestion | null): TeacherTaskPreviewDto {
  const question = publicVersion(version, lang), shown = publicVersion(version, lang, true);
  const statement = teacherPreviewAssets(version, question.locale, ["STATEMENT"], actor);
  const total = version.parts.reduce((sum, part) => sum + part.maxPoints, 0);
  const resource = (html: string, roles: string[], rows?: ReturnType<typeof squareMarkingRows>): TeacherPreviewResource => {
    const assets = teacherPreviewAssets(version, shown.locale, roles, actor);
    const rewritten = assets.rewrite(html), rewrittenRows = rows?.map(row => ({ ...row, html: assets.rewrite(row.html), ...(row.guidance ? { guidance: assets.rewrite(row.guidance) } : {}) }));
    return { html: rewritten, assets: assets.list(rewritten + (rewrittenRows?.map(row => row.html + (row.guidance ?? "")).join("") ?? "")), total,
      ...(rewrittenRows?.length ? { rows: rewrittenRows } : {}) };
  };
  const rows = source ? squareMarkingRows(source) : undefined;
  return {
    taskId: version.taskId, versionId: version.id,
    question: { ...question, statement: statement.rewrite(question.statement),
      parts: question.parts.map(part => ({ ...part, prompt: statement.rewrite(part.prompt), options: part.options.map(option => ({ ...option, text: statement.rewrite(option.text) })) })),
      assets: question.assets.map(asset => ({ ...asset, accessToken: statement.grants.get(asset.id) })),
    },
    answers: resource(source ? renderContent(source.answer_html) : legacyTeacherAnswers(shown), ["ANSWER"]),
    solution: resource(source ? renderContent(source.solution_html) : shown.solution ?? "", ["SOLUTION", "ANSWER"]),
    guidance: resource(rows?.length ? "" : legacyTeacherGuidance(shown), ["MARK_SCHEME"], rows),
  };
}

export async function teacherTaskPreview(actor: Actor | null, taskId: string, input: unknown, lang: string, services: TeacherPreviewReaders = readers): Promise<TeacherTaskPreviewDto> {
  requireTeachingPreview(actor);
  const id = recordId.parse(taskId), { versionId } = query.parse(input);
  const version = await services.readVersion(actor, id);
  ensure(version && version.taskId === id && !version.task.archivedAt &&
    !restrictedMaterial({ ...version.task, versions: [version] }) &&
    (version.task.visibility === "PUBLIC" || version.task.ownerId === actor.id || isAdmin(actor)), 404, "NOT_FOUND");
  ensure(version.id === versionId, 409, "QUESTION_CHANGED");
  return projectTeacherTaskPreview(version, actor, lang, await services.sourceQuestion(version));
}

export type TeacherPackagePreviewReaders = {
  mappings: (actor: Actor, topic: QuadraticTopic) => Promise<Map<string, string>>;
  taskIdForVersion: (versionId: string) => Promise<string | null>;
  preview: (actor: Actor, taskId: string, input: { versionId: string }, lang: string) => Promise<TeacherTaskPreviewDto>;
};
const packageReaders: TeacherPackagePreviewReaders = {
  mappings: visibleSquareMappings,
  taskIdForVersion: async id => (await db().taskVersion.findUnique({ where: { id }, select: { taskId: true } }))?.taskId ?? null,
  preview: teacherTaskPreview,
};

// Resolve an editorial UID only through the current visible import mapping.
// This is the packaged lesson equivalent of the catalogue's exact-version GET.
export async function teacherPackageTaskPreview(actor: Actor | null, input: unknown, lang: string, services: TeacherPackagePreviewReaders = packageReaders): Promise<TeacherTaskPreviewDto> {
  requireTeachingPreview(actor);
  const data = packageQuery.parse(input);
  const packaged = packageTopic(data.lessonId), previous = quadraticTopics.find(candidate => candidate.lessonId === data.lessonId || candidate.key === data.lessonId);
  // A canonical lesson can now have a new package alongside immutable old work.
  const topic = packaged?.version === data.version ? packaged : previous ?? packaged;
  ensure(topic, 404, "NOT_FOUND");
  ensure(topic.version === data.version, 409, "QUESTION_CHANGED");
  const mappings = await services.mappings(actor, topic), versionId = mappings.get(data.uid);
  ensure(versionId, 404, "NOT_FOUND");
  const taskId = await services.taskIdForVersion(versionId);
  ensure(taskId, 404, "NOT_FOUND");
  return services.preview(actor, taskId, { versionId }, lang);
}
