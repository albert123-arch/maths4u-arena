import { z, ZodError } from "zod";
import { db } from "@/lib/prisma";
import { AppError, ensure } from "@/lib/errors";
import { actorForToken, tokenFrom, register, login, logout, sessionCookie, requireActor, admin, changeUser, issueRecovery, recover, rateLimit, userSelect } from "@/lib/security";
import { library, saveTask, editorTask, exportTask } from "@/lib/content";
import { createClass, listClasses, classDetail, joinClass, editClass } from "@/lib/classrooms";
import { listWorks, publishWork, workSummary, startAttempt, getAttempt, mutateAttempt, gradeAttempt, workResults, publishResults, ownWork, practice } from "@/lib/works";
import { createOlympiad, listOlympiads, registerOlympiad, olympiadResults } from "@/lib/olympiads";
import { savePlan, grantSubscription, revokeSubscription } from "@/lib/subscriptions";
import { courses, saveCourse, progress } from "@/lib/courses";
import { importMaterials, importStatus } from "@/lib/importer";
import { upload, download, removeAnswerFile, MAX_FILE_BYTES } from "@/lib/files";
import { checkPilotPublication, stagePilotAsset, publishPilot } from "@/lib/pilot-publish";
import { checkPilotCorrection, applyPilotCorrection } from "@/lib/pilot-correction";
import { catalog, courseCatalog, topicContent, basket, saveBasket } from "@/lib/catalog";
import { structure, saveStructure } from "@/lib/structure";
import { beginStudy, revealStudyHelp, selfCheckStudy, topicStudy } from "@/lib/study";
import { auditStorage, retryDeletedCleanup } from "@/lib/storage-maintenance";
import { checkBankStructure, beginBank, bankStatus, stageBankBatch, bankAssetStatus, stageBankFile, checkBankTasks, applyBankTasks, applyBankStructure } from "@/lib/bank-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Vary": "Cookie" };
function json(data: unknown, status = 200, extra: Record<string, string> = {}) { return Response.json(data, { status, headers: { ...headers, ...extra } }); }
async function boundedBody(request: Request, max: number) {
  ensure(Number(request.headers.get("content-length") ?? 0) <= max, 413, "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new AppError(413, "BODY_TOO_LARGE"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
function csvCell(value: unknown) {
  const s = String(value ?? "");
  return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replace(/"/g, '""') + '"';
}
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const parts = (await context.params).path, route = parts.join("/"), method = request.method;
    const url = new URL(request.url), lang = url.searchParams.get("lang") === "en" ? "en" : "ru";
    let input: unknown = {};
    if (method !== "GET") {
      const expectedOrigin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
      ensure(request.headers.get("origin") === expectedOrigin, 403, "INVALID_ORIGIN");
      if (!route.startsWith("files")) {
        ensure(request.headers.get("content-type")?.startsWith("application/json"), 415, "JSON_REQUIRED");
        try { input = JSON.parse((await boundedBody(request, 2 * 1024 * 1024)).toString() || "{}"); }
        catch (e) { if (e instanceof AppError) throw e; throw new AppError(400, "INVALID_JSON"); }
      }
    }
    if (method === "GET" && route === "health") {
      await db().$queryRawUnsafe("SELECT 1");
      return json({ status: "ok", application: "Maths4U" });
    }
    if (route === "auth/register" && method === "POST") {
      await rateLimit("registration:global", 100, 3600);
      return json(await register(input), 201);
    }
    if (route === "auth/login" && method === "POST") {
      await rateLimit("login:global", 200, 60);
      const result = await login(input);
      return json(result.user, 200, { "Set-Cookie": sessionCookie(result.token) });
    }
    if (route === "auth/recover" && method === "POST") {
      await rateLimit("recovery:global", 30, 60);
      await recover(input); return json({ ok: true });
    }
    if (route === "auth/logout" && method === "POST") {
      await logout(tokenFrom(request)); return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", true) });
    }
    if (method === "GET" && route === "auth/me") return json({ user: await actorForToken(tokenFrom(request)) });
    if (method === "GET" && route === "catalog") return json(await catalog(await actorForToken(tokenFrom(request)), lang, Object.fromEntries(url.searchParams)));
    if (method === "GET" && route === "catalog/courses") return json(await courseCatalog(await actorForToken(tokenFrom(request)), lang, url.searchParams.get("slug") || undefined));
    if (method === "GET" && parts[0] === "catalog" && parts[1] === "topics" && parts.length === 3) return json(await topicContent(await actorForToken(tokenFrom(request)), parts[2], lang));
    if (method === "GET" && route === "library") return json(await library(await actorForToken(tokenFrom(request)), lang, (url.searchParams.get("q") ?? "").slice(0, 100)));
    if (method === "GET" && route === "courses") return json(await courses(await actorForToken(tokenFrom(request)), lang, url.searchParams.get("slug") || undefined));
    if (method === "GET" && parts[0] === "files" && parts.length === 2) {
      const result = await download(await actorForToken(tokenFrom(request)), parts[1], url.searchParams.get("variant") ?? "original");
      const range = request.headers.get("range");
      let start = 0, end = result.data.length - 1;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        ensure(match, 416, "INVALID_RANGE");
        start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
        ensure(Number.isSafeInteger(start) && start >= 0 && start <= end, 416, "INVALID_RANGE");
      }
      return new Response(new Uint8Array(result.data.subarray(start, end + 1)), { status: range ? 206 : 200, headers: { ...headers, "Content-Type": result.file.mimeType,
        "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1), ...(range ? { "Content-Range": `bytes ${start}-${end}/${result.data.length}` } : {}),
        "Content-Disposition": (result.file.mimeType === "application/pdf" ? "attachment" : "inline") + "; filename*=UTF-8''" + encodeURIComponent(result.file.originalName),
        "Content-Security-Policy": "sandbox; default-src 'none'", "Cross-Origin-Resource-Policy": "same-origin" } });
    }
    const actor = await requireActor(request);
    if (route === "study/start" && method === "POST") { await rateLimit("practice:" + actor.id, 60, 3600); return json(await beginStudy(actor, input, lang), 201); }
    if (parts[0] === "study" && parts[1] === "topics" && parts.length === 3 && method === "GET") return json(await topicStudy(actor, parts[2], lang, Number(url.searchParams.get("page") ?? 1)));
    if (parts[0] === "attempts" && parts[2] === "help" && method === "POST") { await revealStudyHelp(actor, parts[1], input, lang); return json(await getAttempt(actor, parts[1], lang)); }
    if (parts[0] === "attempts" && parts[2] === "self-check" && method === "POST") { await selfCheckStudy(actor, parts[1], input); return json(await getAttempt(actor, parts[1], lang)); }
    if (route === "admin/structure" && method === "GET") return json(await structure(actor));
    if (route === "admin/structure" && method === "POST") return json(await saveStructure(actor, input));
    if (route === "basket" && method === "GET") return json(await basket(actor, lang));
    if (route === "basket" && method === "POST") return json(await saveBasket(actor, input, lang));
    if (route === "admin/import/pilot/correction/check" && method === "POST") return json(await checkPilotCorrection(actor, input));
    if (route === "admin/import/pilot/correction/apply" && method === "POST") return json(await applyPilotCorrection(actor, input));
    if (method === "DELETE" && parts[0] === "files" && parts.length === 2) return json(await removeAnswerFile(actor, parts[1], url.searchParams.get("attemptId") ?? ""));
    if (route === "profile" && method === "PATCH") {
      const data = z.object({ locale: z.enum(["ru", "en"]) }).parse(input);
      return json(await db().profile.upsert({ where: { userId: actor.id }, create: { userId: actor.id, ...data }, update: data }));
    }
    if (route === "classes" && method === "GET") return json(await listClasses(actor, url.searchParams.get("manage") === "1"));
    if (route === "classes" && method === "POST") return json(await createClass(actor, input), 201);
    if (route === "classes/join" && method === "POST") { await rateLimit("class-join:" + actor.id, 20, 60); return json(await joinClass(actor, input)); }
    if (parts[0] === "classes" && parts.length === 2) {
      if (method === "GET") return json(await classDetail(actor, parts[1]));
      if (method === "PATCH") return json(await editClass(actor, parts[1], input));
    }
    if (parts[0] === "tasks" && parts.length === 3 && parts[2] === "export" && method === "GET") {
      const exported = await exportTask(actor, parts[1]);
      return new Response(JSON.stringify(exported, null, 2), {headers:{"content-type":"application/json; charset=utf-8","content-disposition":"attachment; filename=maths4u-task.json","cache-control":"private, no-store"}});
    }
    if (route === "admin/storage" && method === "GET") { admin(actor); return json(await auditStorage()); }
    if (route === "admin/storage/retry-deleted" && method === "POST") { admin(actor); await rateLimit("storage-cleanup:"+actor.id,5,3600); return json(await retryDeletedCleanup()); }
    if (route === "tasks" && method === "POST") return json(await saveTask(actor, input), 201);
    if (parts[0] === "tasks" && parts.length === 2) {
      if (method === "GET") return json(await editorTask(actor, parts[1]));
      if (method === "PATCH") return json(await saveTask(actor, input, parts[1]));
    }
    if (parts[0] === "tasks" && parts[2] === "archive" && method === "POST") {
      await editorTask(actor, parts[1]);
      return json(await db().task.update({ where: { id: parts[1] }, data: { archivedAt: new Date() } }));
    }
    if (parts[0] === "tasks" && parts[2] === "practice" && method === "POST") {
      await rateLimit("practice:" + actor.id, 60, 3600);
      return json(await practice(actor, parts[1]), 201);
    }
    if (route === "works" && method === "GET") return json(await listWorks(actor, url.searchParams.get("manage") === "1"));
    if (route === "works" && method === "POST") return json(await publishWork(actor, input), 201);
    if (parts[0] === "works" && parts.length === 2 && method === "GET") return json(await workSummary(actor, parts[1]));
    if (parts[0] === "works" && parts[2] === "start" && method === "POST") {
      const data = z.object({ newAttempt: z.boolean().default(false) }).parse(input);
      return json(await startAttempt(actor, parts[1], data.newAttempt));
    }
    if (parts[0] === "works" && parts[2] === "publish-results" && method === "POST") return json(await publishResults(actor, parts[1]));
    if (parts[0] === "works" && parts[2] === "archive" && method === "POST") {
      await ownWork(actor, parts[1]);
      return json(await db().work.update({ where: { id: parts[1] }, data: { archivedAt: new Date() } }));
    }
    if (parts[0] === "works" && ["results", "export"].includes(parts[2]) && method === "GET") {
      const rows = await workResults(actor, parts[1]);
      if (parts[2] === "results") return json(rows);
      const csv = [["Student", "Login", "Attempt", "Status", "Score", "Maximum", "Submitted"], ...rows.map(r => [r.student.displayName, r.student.username, r.number, r.status, r.score, r.maxPoints, r.submittedAt?.toISOString()])];
      return new Response("\uFEFF" + csv.map(row => row.map(csvCell).join(",")).join("\r\n"), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="maths4u-results.csv"' } });
    }
    if (parts[0] === "attempts" && parts.length === 2 && method === "GET") return json(await getAttempt(actor, parts[1], lang));
    if (parts[0] === "attempts" && parts[2] === "save" && method === "POST") {
      await mutateAttempt(actor, parts[1], input); return json(await getAttempt(actor, parts[1], lang));
    }
    if (parts[0] === "attempts" && parts[2] === "submit" && method === "POST") {
      await mutateAttempt(actor, parts[1], input, true); return json(await getAttempt(actor, parts[1], lang));
    }
    if (parts[0] === "attempts" && parts[2] === "review" && method === "POST") return json(await gradeAttempt(actor, parts[1], input));
    if (route === "files" && method === "POST") {
      await rateLimit("file-upload:" + actor.id, 30, 60);
      await rateLimit("upload:" + actor.id, 30, 60);
      const data = await boundedBody(request, MAX_FILE_BYTES + 64000);
      const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") || "" }, body: new Uint8Array(data) }).formData();
      const file = form.get("file");
      ensure(file instanceof File, 400, "FILE_REQUIRED");
      return json(await upload(actor, file, typeof form.get("attemptId") === "string" ? String(form.get("attemptId")) : undefined,
        typeof form.get("partId") === "string" ? String(form.get("partId")) : undefined,
        typeof form.get("replaceId") === "string" ? String(form.get("replaceId")) : undefined), 201);
    }
    if (route === "olympiads" && method === "GET") return json(await listOlympiads(actor));
    if (route === "olympiads" && method === "POST") return json(await createOlympiad(actor, input), 201);
    if (parts[0] === "olympiads" && parts[2] === "register" && method === "POST") return json(await registerOlympiad(actor, parts[1], input));
    if (parts[0] === "olympiads" && parts[2] === "results" && method === "GET") return json(await olympiadResults(actor, parts[1]));
    if (route === "courses" && method === "POST") return json(await saveCourse(actor, input), 201);
    if (parts[0] === "lessons" && parts[2] === "progress" && method === "POST") return json(await progress(actor, parts[1], input));
    if (route === "subscriptions" && method === "GET") return json(await db().subscription.findMany({ where: { userId: actor.id }, include: { plan: { include: { features: { include: { feature: true } } } } }, orderBy: { endsAt: "desc" } }));
    if (parts[0] === "admin") {
      admin(actor);
      if (route === "admin/import/pilot/check" && method === "POST") return json(await checkPilotPublication(actor, input));
      if (route === "admin/import/pilot/asset" && method === "POST") return json(await stagePilotAsset(actor, input));
      if (route === "admin/import/pilot/publish" && method === "POST") return json(await publishPilot(actor, input));
      if (route === "admin/users" && method === "GET") return json(await db().user.findMany({ where: { OR: [
        { username: { contains: (url.searchParams.get("q") ?? "").slice(0, 100) } }, { displayName: { contains: (url.searchParams.get("q") ?? "").slice(0, 100) } },
      ] }, select: userSelect, orderBy: { createdAt: "desc" }, take: 100 }));
      if (parts[1] === "users" && parts.length === 3 && method === "PATCH") return json(await changeUser(actor, parts[2], input));
      if (parts[1] === "users" && parts[3] === "recovery" && method === "POST") return json(await issueRecovery(actor, parts[2]));
      if (route === "admin/plans" && method === "GET") return json(await db().plan.findMany({ include: { features: { include: { feature: true } } } }));
      if (route === "admin/plans" && method === "POST") return json(await savePlan(actor, input));
      if (route === "admin/subscriptions" && method === "POST") return json(await grantSubscription(actor, input), 201);
      if (route === "admin/subscriptions" && method === "GET") return json(await db().subscription.findMany({ take: 100, orderBy: { endsAt: "desc" },
        include: { plan: true, user: { select: { username: true, displayName: true } } } }));
      if (parts[1] === "subscriptions" && parts[3] === "revoke" && method === "POST") return json(await revokeSubscription(actor, parts[2]));
      if (route === "admin/import" && method === "POST") return json(await importMaterials(actor, input));
      if (route === "admin/bank/start" && method === "POST") return json(await beginBank(actor,input));
      if (route === "admin/bank/status" && method === "GET") return json(await bankStatus(actor,url.searchParams.get("runId")??""));
      if (route === "admin/bank/stage" && method === "POST") return json(await stageBankBatch(actor,input));
      if (route === "admin/bank/files/check" && method === "POST") return json(await bankAssetStatus(actor,input));
      if (route === "admin/bank/files" && method === "POST") return json(await stageBankFile(actor,input));
      if (route === "admin/bank/check" && method === "POST") return json(await checkBankTasks(actor,input));
      if (route === "admin/bank/apply" && method === "POST") return json(await applyBankTasks(actor,input));
      if (route === "admin/bank/structure/check" && method === "POST") return json(await checkBankStructure(actor,input));
      if (route === "admin/bank/structure" && method === "POST") return json(await applyBankStructure(actor,input));
      if (route === "admin/import" && method === "GET") return json(await importStatus(actor));
      if (route === "admin/status" && method === "GET") return json({ users: await db().user.count(), tasks: await db().task.count(), attempts: await db().attempt.count(),
        pendingReview: await db().attempt.count({ where: { status: "SUBMITTED" } }), paymentsEnabled: false, aiEnabled: false,
        migrations: await db().$queryRawUnsafe("SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at") });
    }
    throw new AppError(404, "NOT_FOUND");
  } catch (e) {
    if (e instanceof AppError) return json({ error: e.code }, e.status);
    if (e instanceof ZodError) return json({ error: "INVALID_INPUT", fields: e.issues.map(i => ({ path: i.path.join("."), message: i.message })) }, 400);
    const code = (e as { code?: string }).code;
    if (code === "P2002") return json({ error: "ALREADY_EXISTS" }, 409);
    if (code === "P2025") return json({ error: "NOT_FOUND" }, 404);
    if (code === "P2003") return json({ error: "INVALID_REFERENCE" }, 400);
    // No raw driver messages, URLs, passwords, answer payloads or environment values in logs.
    console.error("Maths4U request failed", e instanceof Error ? e.name : "UnknownError");
    return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
