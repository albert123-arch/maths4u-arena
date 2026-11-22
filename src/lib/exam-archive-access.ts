import { z } from "zod";
import { db } from "./prisma";
import { ensure } from "./errors";
import { type Actor, isAdmin, lockUser, tokenFrom, transaction } from "./security";
import { requestView } from "./request-view";
import { resolveRequestView } from "./view-lens";

export const examArchiveSyllabuses = ["9709", "9231", "0606", "0580"] as const;
export type ExamArchiveSyllabus = (typeof examArchiveSyllabuses)[number];
const syllabusSchema = z.enum(examArchiveSyllabuses);

export const examArchiveHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};

export type ExamArchiveAccess = {
  actor: Actor;
  admin: boolean;
  syllabuses: ExamArchiveSyllabus[];
};

type Grant = { startsAt: Date; expiresAt: Date; revokedAt: Date | null; syllabuses: unknown };

export function examArchiveGrantScope(grant: Grant | null, now: Date): ExamArchiveSyllabus[] {
  if (!grant || grant.revokedAt || grant.startsAt > now || grant.expiresAt <= now) return [];
  const scope = z.array(syllabusSchema).safeParse(grant.syllabuses);
  if (!scope.success) return [];
  return scope.data.length ? [...new Set(scope.data)] : [...examArchiveSyllabuses];
}

async function examArchiveAccess(actor: Actor | null): Promise<ExamArchiveAccess | null> {
  if (!actor || actor.status !== "ACTIVE") return null;
  if (isAdmin(actor)) return { actor, admin: true, syllabuses: [...examArchiveSyllabuses] };
  const grant = await db().examArchiveGrant.findUnique({ where: { userId: actor.id } });
  const syllabuses = examArchiveGrantScope(grant, new Date());
  return syllabuses.length ? { actor, admin: false, syllabuses } : null;
}

export async function hasExamArchiveAccess(actor: Actor | null) {
  return !requestView()?.lens && !!(await examArchiveAccess(actor));
}

export async function requireExamArchiveAccess(request: Request): Promise<ExamArchiveAccess> {
  const view = await resolveRequestView(tokenFrom(request));
  ensure(!view.lens && !request.headers.get("x-arena-view"), 404, "NOT_FOUND");
  const access = await examArchiveAccess(view.actor);
  ensure(access, 404, "NOT_FOUND");
  return access;
}

export async function logExamArchiveAccess(access: ExamArchiveAccess, action: string, targetId: string) {
  await db().auditEvent.create({ data: { actorId: access.actor.id, action: "EXAM_ARCHIVE_" + action, targetId } });
}

const identifier = z.string().regex(/^[a-zA-Z0-9_.:-]{1,191}$/);
export const examArchiveId = (value: string) => identifier.parse(value);

export const examArchivePreferenceSchema = z.object({
  mode: z.enum(["topicwise", "past-papers"]).optional(),
  showOtherCourses: z.boolean().optional(),
  topicKey: identifier.nullable().optional(),
  paperId: identifier.nullable().optional(),
  syllabus: syllabusSchema.nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  session: z.string().regex(/^[a-zA-Z][a-zA-Z /-]{0,39}$/).nullable().optional(),
}).strict();

export async function examArchivePreferences(access: ExamArchiveAccess) {
  const { actor, syllabuses } = access;
  const saved = await db().examArchivePreference.findUnique({ where: { userId: actor.id } });
  const syllabus = saved?.syllabus as ExamArchiveSyllabus | undefined;
  const visible = syllabus && syllabuses.includes(syllabus);
  return {
    mode: saved?.mode === "past-papers" ? "past-papers" as const : "topicwise" as const,
    showOtherCourses: saved?.showOtherCourses ?? false,
    topicKey: saved?.topicKey ?? null,
    paperId: visible ? saved?.paperId ?? null : null,
    syllabus: visible ? syllabus : null,
    year: visible ? saved?.year ?? null : null,
    session: visible ? saved?.session ?? null : null,
  };
}

export async function changeExamArchivePreferences(access: ExamArchiveAccess, input: unknown) {
  const data = examArchivePreferenceSchema.parse(input);
  if (data.syllabus) ensure(access.syllabuses.includes(data.syllabus), 404, "NOT_FOUND");
  const userId = access.actor.id;
  await db().examArchivePreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return examArchivePreferences(access);
}

const grantInput = z.object({
  expiresAt: z.iso.datetime({ offset: true }),
  syllabuses: z.array(syllabusSchema).max(examArchiveSyllabuses.length),
}).strict();

export async function examArchiveGrants(access: ExamArchiveAccess, query = "") {
  ensure(access.admin, 404, "NOT_FOUND");
  const search = z.string().trim().max(80).parse(query);
  const [grants, users] = await Promise.all([
    db().examArchiveGrant.findMany({
      orderBy: { expiresAt: "desc" },
      include: { user: { select: { username: true, displayName: true, status: true } } },
    }),
    search ? db().user.findMany({
      where: {
        status: "ACTIVE",
        roles: { none: { role: "ADMIN" } },
        OR: [{ username: { contains: search } }, { displayName: { contains: search } }],
      },
      orderBy: { username: "asc" },
      select: { id: true, username: true, displayName: true },
      take: 20,
    }) : [],
  ]);
  await logExamArchiveAccess(access, "GRANTS_READ", "grants");
  return {
    grants: grants.map(({ user, userId, startsAt, expiresAt, revokedAt, syllabuses }) => ({
      userId, username: user.username, displayName: user.displayName, status: user.status, startsAt, expiresAt,
      revokedAt, syllabuses: z.array(syllabusSchema).catch([]).parse(syllabuses),
      active: user.status === "ACTIVE" && examArchiveGrantScope({ startsAt, expiresAt, revokedAt, syllabuses }, new Date()).length > 0,
    })),
    users,
  };
}

export async function grantExamArchiveAccess(access: ExamArchiveAccess, rawUserId: string, input: unknown) {
  ensure(access.admin, 404, "NOT_FOUND");
  const userId = examArchiveId(rawUserId);
  const parsed = grantInput.parse(input);
  const expiresAt = new Date(parsed.expiresAt);
  const startsAt = new Date();
  ensure(expiresAt > startsAt && expiresAt.getUTCFullYear() <= 2100, 400, "INVALID_EXPIRY");
  await transaction(async tx => {
    await lockUser(tx, userId);
    const user = await tx.user.findFirst({
      where: { id: userId, status: "ACTIVE", roles: { none: { role: "ADMIN" } } }, select: { id: true },
    });
    ensure(user, 404, "NOT_FOUND");
    const data = {
      issuerId: access.actor.id,
      startsAt,
      expiresAt,
      syllabuses: [...new Set(parsed.syllabuses)],
      revokedAt: null,
    };
    const existing = await tx.examArchiveGrant.findUnique({ where: { userId }, select: { revokedAt: true, expiresAt: true } });
    await tx.examArchiveGrant.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    const action = existing && !existing.revokedAt && existing.expiresAt > startsAt ? "UPDATED" : "ISSUED";
    await tx.auditEvent.create({ data: { actorId: access.actor.id, action: "EXAM_ARCHIVE_GRANT_" + action, targetId: userId } });
  });
  return { ok: true };
}

export async function revokeExamArchiveAccess(access: ExamArchiveAccess, rawUserId: string) {
  ensure(access.admin, 404, "NOT_FOUND");
  const userId = examArchiveId(rawUserId);
  await transaction(async tx => {
    await lockUser(tx, userId);
    const result = await tx.examArchiveGrant.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count) {
      await tx.auditEvent.create({ data: { actorId: access.actor.id, action: "EXAM_ARCHIVE_GRANT_REVOKED", targetId: userId } });
    }
  });
  return { ok: true };
}
