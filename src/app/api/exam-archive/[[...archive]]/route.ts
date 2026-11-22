import { ZodError } from "zod";
import { AppError, ensure } from "@/lib/errors";
import {
  changeExamArchivePreferences, examArchiveGrants, examArchiveHeaders, grantExamArchiveAccess,
  requireExamArchiveAccess, revokeExamArchiveAccess,
} from "@/lib/exam-archive-access";
import { examArchiveOverview, examArchivePaper, examArchiveTopic } from "@/lib/exam-archive";
import { examArchiveAsset, examArchiveQuestion, examArchiveQuestionCards, examArchiveSupport } from "@/lib/exam-archive-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(request: Request, data: unknown, status = 200) {
  if (request.method === "HEAD") return new Response(null, { status, headers: examArchiveHeaders });
  return Response.json(data, { status, headers: examArchiveHeaders });
}

async function requestJson(request: Request) {
  const expected = new URL(process.env.APP_URL || "http://localhost:3000").origin;
  ensure(request.headers.get("origin") === expected, 403, "INVALID_ORIGIN");
  ensure(request.headers.get("content-type")?.split(";")[0].trim() === "application/json", 415, "JSON_REQUIRED");
  const reader = request.body?.getReader();
  ensure(reader, 400, "INVALID_JSON");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      throw new AppError(413, "BODY_TOO_LARGE");
    }
    chunks.push(item.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AppError(400, "INVALID_JSON"); }
}

async function dispatch(request: Request, context: { params: Promise<{ archive?: string[] }> }) {
  try {
    const access = await requireExamArchiveAccess(request);
    const parts = (await context.params).archive ?? [];
    const url = new URL(request.url);
    const read = request.method === "GET" || request.method === "HEAD";
    const [collection, id, subroute, asset] = parts;
    if (read) {
      if (!parts.length) return respond(request, await examArchiveOverview(access));
      const includeCards = request.method === "GET" && url.searchParams.get("cards") === "1";
      if (collection === "topics" && parts.length === 2) {
        const filters = Object.fromEntries(url.searchParams);
        delete filters.cards;
        const topic = await examArchiveTopic(access, id, filters);
        return respond(request, includeCards ? { ...topic, cards: await examArchiveQuestionCards(access, topic.questions) } : topic);
      }
      if (collection === "papers" && parts.length === 2) {
        const paper = await examArchivePaper(access, id);
        return respond(request, includeCards ? { ...paper, cards: await examArchiveQuestionCards(access, paper.questions) } : paper);
      }
      if (collection === "questions") {
        if (parts.length === 2) return respond(request, await examArchiveQuestion(access, id));
        if (parts.length === 3 && (subroute === "solution" || subroute === "mark-scheme")) {
          return respond(request, await examArchiveSupport(access, id, subroute));
        }
        if (parts.length === 4 && subroute === "assets") return await examArchiveAsset(access, id, asset, request);
      }
      if (collection === "grants" && parts.length === 1) return respond(request, await examArchiveGrants(access, url.searchParams.get("q") ?? ""));
    } else {
      if (collection === "preferences" && parts.length === 1 && request.method === "PATCH") {
        return respond(request, await changeExamArchivePreferences(access, await requestJson(request)));
      }
      if (collection === "grants" && parts.length === 2 && access.admin) {
        if (request.method === "PUT") {
          return respond(request, await grantExamArchiveAccess(access, id, await requestJson(request)));
        }
        if (request.method === "DELETE") {
          const expected = new URL(process.env.APP_URL || "http://localhost:3000").origin;
          ensure(request.headers.get("origin") === expected, 403, "INVALID_ORIGIN");
          return respond(request, await revokeExamArchiveAccess(access, id));
        }
      }
    }
    return respond(request, { error: "NOT_FOUND" }, 404);
  } catch (err) {
    if (err instanceof AppError) return respond(request, { error: err.code }, err.status);
    if (err instanceof ZodError) return respond(request, { error: "INVALID_INPUT" }, 400);
    console.error("Exam archive request failed");
    return respond(request, { error: "INTERNAL_ERROR" }, 500);
  }
}

export const GET = dispatch;
export const HEAD = dispatch;
export const PATCH = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
