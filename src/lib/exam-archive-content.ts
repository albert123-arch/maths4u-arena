import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "../generated/prisma/client";
import { db } from "./prisma";
import { ensure, AppError } from "./errors";
import { digest } from "./security";
import { renderContent } from "./content";
import { privateStorageRoot } from "./storage-config";
import { verifyBankSvg } from "./bank-svg.mjs";
import { type ExamArchiveAccess, examArchiveHeaders, examArchiveId, logExamArchiveAccess } from "./exam-archive-access";
import { lookupExamArchiveQuestion } from "./exam-archive";

const diagramTypes = ["image/png", "image/jpeg", "image/svg+xml"] as const;
type DiagramMime = (typeof diagramTypes)[number];
type ArchiveAssetRole = "STATEMENT" | "SOLUTION" | "MARK_SCHEME";
type ArchiveRights = Awaited<ReturnType<typeof lookupExamArchiveQuestion>>["rights"];

const fileWhere = { deletedAt: null, mimeType: { in: [...diagramTypes] } } satisfies Prisma.StoredFileWhereInput;
function archiveAssetLinks(questionId: string, assets: { id: string; caption: string }[]) {
  return assets.map(({ id, caption }) => ({
    href: "/api/exam-archive/questions/" + encodeURIComponent(questionId) + "/assets/" + encodeURIComponent(id),
    caption,
  }));
}

// Images are delivered by the archive route and bound to the approved version.
// In particular, do not retain old /api/files or imported external references.
const archiveHtml = (text: string | null | undefined) => renderContent(text ?? "").replace(/<img\b[^>]*>/gi, "");
const english = { locale: "en" } as const;
const localeAsset = { OR: [{ locale: null }, { locale: "en" }] } satisfies Prisma.TaskAssetWhereInput;
const publishedVersion = (id: string, syllabus: string): Prisma.TaskVersionWhereInput =>
  ({ id, syllabus: { equals: syllabus }, task: { archivedAt: null } });

export async function examArchiveQuestion(access: ExamArchiveAccess, rawId: string) {
  const { question, rights, summary, topics, papers } = await lookupExamArchiveQuestion(access, rawId);
  const roles = allowedAssetRoles(rights);
  const version = rights.statement && question.taskVersionId ? await db().taskVersion.findFirst({
    where: publishedVersion(question.taskVersionId, question.syllabus),
    select: {
      texts: { where: english, select: {
        statement: true, ...(access.admin && { teacherNote: true }),
        ...(rights.solution && { solution: true }),
        ...(rights.markScheme && { markSchemeText: true, markSchemeStatus: true }),
      } },
      parts: { orderBy: { position: "asc" }, select: {
        maxPoints: true, texts: { where: english, select: {
          prompt: true, ...(rights.markScheme && { markSchemeText: true, markSchemeStatus: true }),
        } },
        options: { orderBy: { position: "asc" }, select: { texts: { where: english, select: { text: true } } } },
      } },
      assets: { where: { role: { in: roles }, ...localeAsset, file: fileWhere }, select: { id: true, caption: true, role: true } },
    },
  }) : null;
  const text = version?.texts[0];
  const printedLabel = question.sources.length === 1 ? question.sources[0].printedPart : null;
  const partCount = version?.parts.length ?? 0;
  const parts = version?.parts.flatMap((part, index) => {
    const html = archiveHtml(part.texts[0]?.prompt);
    const options = part.options.flatMap((option, i) => option.texts[0] ? [{
      label: String.fromCharCode(65 + i), html: archiveHtml(option.texts[0].text),
    }] : []);
    if (!html && !options.length) return [];
    const label = index === 0 && printedLabel ? printedLabel
      : partCount > 1 && index < 26 ? "(" + String.fromCharCode(97 + index) + ")" : "";
    return [{ label, marks: part.maxPoints, html, options }];
  }) ?? [];
  const statementHtml = archiveHtml(text?.statement) || null;
  const hasAsset = (role: ArchiveAssetRole) => !!version?.assets.some(asset => asset.role === role);
  const hasVerifiedMarkScheme = (value: { markSchemeStatus?: string; markSchemeText?: string | null } | undefined) =>
    value?.markSchemeStatus === "VERIFIED" && !!value.markSchemeText?.trim();
  await logExamArchiveAccess(access, "QUESTION_READ", question.id);
  return {
    ...summary, hasContent: !!(statementHtml || parts.length), topics, papers, statementHtml, parts,
    assets: archiveAssetLinks(question.id, (version?.assets ?? []).filter(asset => asset.role === "STATEMENT")),
    teacherNotesHtml: access.admin ? archiveHtml(text?.teacherNote) || null : null,
    support: {
      solution: rights.solution && (!!text?.solution?.trim() || hasAsset("SOLUTION")),
      markScheme: rights.markScheme && (hasVerifiedMarkScheme(text) ||
        !!version?.parts.some(part => hasVerifiedMarkScheme(part.texts[0])) || hasAsset("MARK_SCHEME")),
    },
  };
}

export async function examArchiveSupport(access: ExamArchiveAccess, rawId: string, kind: "solution" | "mark-scheme") {
  const { question, rights } = await lookupExamArchiveQuestion(access, rawId);
  const solution = kind === "solution";
  ensure(question.taskVersionId && (solution ? rights.solution : rights.markScheme), 404, "NOT_FOUND");
  const role = solution ? "SOLUTION" : "MARK_SCHEME";
  const version = await db().taskVersion.findFirst({
    where: publishedVersion(question.taskVersionId, question.syllabus),
    select: {
      texts: { where: english, select: { solution: true, markSchemeText: true, markSchemeStatus: true } },
      parts: { orderBy: { position: "asc" }, select: {
        texts: { where: english, select: { markSchemeText: true, markSchemeStatus: true } },
      } },
      assets: { where: { role, ...localeAsset, file: fileWhere }, select: { id: true, caption: true } },
    },
  });
  ensure(version, 404, "NOT_FOUND");
  const text = version.texts[0];
  const partSchemes = version.parts.flatMap(part =>
    part.texts[0]?.markSchemeStatus === "VERIFIED" && part.texts[0].markSchemeText ? [part.texts[0].markSchemeText] : []);
  const html = archiveHtml(solution ? text?.solution : text?.markSchemeStatus === "VERIFIED" && text.markSchemeText
    ? text.markSchemeText : partSchemes.join("\n"));
  const assets = rights.assets ? archiveAssetLinks(question.id, version.assets) : [];
  ensure(html || assets.length, 404, "NOT_FOUND");
  await logExamArchiveAccess(access, solution ? "SOLUTION_READ" : "MARK_SCHEME_READ", question.id);
  return { html, assets };
}

function allowedAssetRoles(rights: ArchiveRights): ArchiveAssetRole[] {
  if (!rights.statement || !rights.assets) return [];
  return ["STATEMENT", ...(rights.solution ? ["SOLUTION" as const] : []), ...(rights.markScheme ? ["MARK_SCHEME" as const] : [])];
}

export function archiveImageMatchesType(bytes: Buffer, mime: string) {
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime !== "image/svg+xml") return false;
  try { verifyBankSvg(bytes); return true; } catch { return false; }
}

export function examArchiveFileRange(header: string | null, size: number) {
  if (!header) return { start: 0, end: size - 1 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  ensure(match && (match[1] || match[2]), 416, "INVALID_RANGE");
  const left = match[1] ? Number(match[1]) : null;
  const right = match[2] ? Number(match[2]) : null;
  ensure((left === null || Number.isSafeInteger(left)) && (right === null || Number.isSafeInteger(right)), 416, "INVALID_RANGE");
  const start = left ?? Math.max(0, size - right!);
  const end = left === null || right === null ? size - 1 : Math.min(right, size - 1);
  ensure(start >= 0 && start <= end, 416, "INVALID_RANGE");
  return { start, end };
}

export async function examArchiveAsset(access: ExamArchiveAccess, rawQuestionId: string, rawAssetId: string, request: Request) {
  const { question, rights } = await lookupExamArchiveQuestion(access, rawQuestionId);
  const assetId = examArchiveId(rawAssetId);
  const roles = allowedAssetRoles(rights);
  ensure(question.taskVersionId && roles.length, 404, "NOT_FOUND");
  const asset = await db().taskAsset.findFirst({
    where: { id: assetId, version: publishedVersion(question.taskVersionId, question.syllabus),
      role: { in: roles }, ...localeAsset, file: fileWhere },
    select: { file: { select: { storageKey: true, mimeType: true, size: true, sha256: true } } },
  });
  ensure(asset, 404, "NOT_FOUND");
  const { storageKey, mimeType, size, sha256 } = asset.file;
  ensure(/^[a-zA-Z0-9_-]{43}$/.test(storageKey) && size > 0 && size <= 8 * 1024 * 1024, 404, "NOT_FOUND");
  const root = privateStorageRoot();
  const filepath = path.join(root, storageKey);
  // Verify that no symlink redirects the stored identifier out of private storage.
  const bytes = await (async () => {
    try {
      const stat = await lstat(filepath);
      if (!stat.isFile() || stat.size !== size || await realpath(filepath) !== filepath) return null;
      return await readFile(filepath);
    } catch { return null; }
  })();
  ensure(bytes && bytes.length === size && digest(bytes) === sha256 && archiveImageMatchesType(bytes, mimeType), 404, "NOT_FOUND");
  const range = request.headers.get("range");
  const headers = {
    ...examArchiveHeaders,
    "Content-Type": mimeType as DiagramMime,
    "Content-Disposition": "inline",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Accept-Ranges": "bytes",
  };
  let bounds;
  try {
    bounds = examArchiveFileRange(range, size);
  } catch (err) {
    if (err instanceof AppError && err.status === 416) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": "bytes */" + size } });
    }
    throw err;
  }
  const { start, end } = bounds;
  await logExamArchiveAccess(access, "ASSET_READ", assetId);
  return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes.subarray(start, end + 1)), {
    status: range ? 206 : 200,
    headers: {
      ...headers, "Content-Length": String(end - start + 1),
      ...(range ? { "Content-Range": "bytes " + start + "-" + end + "/" + size } : {}),
    },
  });
}
