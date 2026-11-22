import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { archiveCourses, archiveReference, examArchivePlan } from "./exam-archive-metadata.mjs";

const legacyId = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/).transform(Number)]).pipe(z.number().int().positive());
const marksSchema = z.number().int().min(0).max(500).nullish();
const assetRole = z.enum(["question", "solution", "mark_scheme"]);
const assetSchema = z.object({
  role: assetRole,
  source_url: z.string(),
  available: z.boolean(),
  sort_order: z.number().int().optional(),
});
const chapterSchema = z.object({
  lessons: z.array(z.object({
    questions: z.array(z.object({
      id: legacyId,
      exam: z.object({
        syllabus: z.string(),
        year: z.number().int(),
        examSession: z.string(),
        paper: z.string(),
        questionNumber: z.string(),
      }),
      marks: marksSchema,
      question_html: z.string().min(1),
      solution_html: z.string().nullish(),
      assets: z.array(assetSchema).default([]),
      parts: z.array(z.object({ prompt_html: z.string(), marks: marksSchema })).default([]),
    })),
  })),
});

const mappedMediaSchema = z.array(z.object({ legacyId, role: assetRole, url: z.string() }));
type SourceQuestion = z.infer<typeof chapterSchema>["lessons"][number]["questions"][number];
type Asset = z.infer<typeof assetSchema>;
type AssetRole = z.infer<typeof assetRole>;
type LegacyItem = { source: SourceQuestion; part: string | null };
export type ResourceLink = { href: string; caption: string };
export type InternalContent = {
  questionId: string;
  statementHtml: string;
  solutionHtml: string | null;
  images: ResourceLink[];
  solutionImages: ResourceLink[];
  markSchemes: ResourceLink[];
};

export function archivedMaths4uAsset(value: string): string | null {
  try {
    const url = new URL(value);
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin !== "https://maths4u.sbs" || url.username || url.password || url.search || url.hash
        || !/^\/uploads\/(?:exams|problems)\/.+\.(?:png|jpe?g|svg)$/i.test(decodedPath)
        || /(?:\\|[\u0000-\u001f\u007f]|(?:^|\/)\.\.?(?:\/|$))/u.test(decodedPath)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeArchivedHtml(value: string) {
  return value
    .replace(/\u000c(?=rac\b)/g, "\\f")
    .replace(/\u0008(?=(?:egin|inom|oldsymbol)\b)/g, "\\b")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    // Legacy inline image paths are relative to an offline chapter export.
    // Verified remote links are attached separately rather than baked into HTML.
    .replace(/<img\b[^>]*>/gi, "")
    .trim();
}

function explicitPartLabel(part: string | null) {
  return part && /^[a-z]{1,10}$/.test(part) ? "(" + part + ")" : null;
}

function marksLabel(marks: number) {
  return marks + (marks === 1 ? " mark" : " marks");
}

function labelFor(item: LegacyItem, offset: number, total: number) {
  return explicitPartLabel(item.part) ? "Part " + explicitPartLabel(item.part) : total > 1 ? "Source extract " + (offset + 1) : null;
}

function structuredPartMarks(source: SourceQuestion) {
  const labelled = source.parts.flatMap(part => {
    if (part.marks === null || part.marks === undefined) return [];
    const text = part.prompt_html.replace(/<[^>]*>/g, "").trim();
    const label = text.match(/^\([a-z]+\)(?:\s*\([ivx]+\))*/i)?.[0];
    return label ? ["<li>" + label + " · " + marksLabel(part.marks) + "</li>"] : [];
  });
  return labelled.length ? "<p><strong>Marks by part</strong></p><ul>" + labelled.join("") + "</ul>" : "";
}

function combineMarkup(items: readonly LegacyItem[], kind: "statement" | "solution") {
  const prepared = items.map((item, index) => {
    const body = normalizeArchivedHtml(kind === "statement" ? item.source.question_html : item.source.solution_html ?? "");
    return { item, body, index };
  }).filter(({ body }) => body.length);
  const unique = prepared.filter(({ body, item }, index) =>
    prepared.findIndex(row => row.body === body && row.item.part === item.part
      && (kind === "solution" || row.item.source.marks === item.source.marks)) === index);
  return unique.map(({ item, body, index }) => {
    const label = labelFor(item, index, items.length);
    const marks = kind === "statement" && item.source.marks !== null && item.source.marks !== undefined
      ? marksLabel(item.source.marks) : null;
    const heading = label ? "<h4>" + label + (marks ? " · " + marks : "") + "</h4>" : "";
    const partMarks = kind === "statement" ? structuredPartMarks(item.source) : "";
    return heading + body + partMarks;
  }).join("\n");
}

function resourceList(items: readonly LegacyItem[], role: AssetRole, mapped: ReadonlyMap<number, Asset[]>) {
  const links = new Map<string, ResourceLink>();
  const resourceLabel = { question: "Diagram", solution: "Solution figure", mark_scheme: "Mark scheme" }[role];
  items.forEach((item, index) => {
    const assets = [...item.source.assets, ...(mapped.get(item.source.id) ?? [])]
      .filter(asset => asset.role === role && asset.available)
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
    const label = labelFor(item, index, items.length);
    assets.forEach((asset, position) => {
      const href = archivedMaths4uAsset(asset.source_url);
      if (!href || links.has(href)) return;
      const context = label ? label + " · " : "";
      const caption = context + resourceLabel + (assets.length > 1 ? " " + (position + 1) : "");
      links.set(href, { href, caption });
    });
  });
  return [...links.values()];
}

export function makeInternalContent(questionId: string, items: readonly LegacyItem[], mapped: ReadonlyMap<number, Asset[]>) {
  const statementHtml = combineMarkup(items, "statement");
  if (!statementHtml) throw new Error("An archive question lacks a full statement.");
  return {
    questionId,
    statementHtml,
    solutionHtml: combineMarkup(items, "solution") || null,
    images: resourceList(items, "question", mapped),
    solutionImages: resourceList(items, "solution", mapped),
    markSchemes: resourceList(items, "mark_scheme", mapped),
  } satisfies InternalContent;
}

async function loadSourceContent(root: string, metadata: Awaited<ReturnType<typeof examArchivePlan>>["archive"]) {
  const sources = new Map(metadata.sources.map(source => [source.sourceKey, source]));
  const grouped = new Map<string, LegacyItem[]>();
  for (const [folder, syllabus] of archiveCourses) {
    const directory = join(root, folder);
    const files = (await readdir(directory, { withFileTypes: true }))
      .filter(file => file.isFile() && /^\d{2} .+\.json$/.test(file.name))
      .map(file => file.name)
      .sort();
    for (const file of files) {
      const data = chapterSchema.parse(JSON.parse((await readFile(join(directory, file), "utf8")).replace(/^\uFEFF/, "")));
      for (const lesson of data.lessons) for (const row of lesson.questions) {
        const key = "maths4u:problems:" + row.id;
        const existing = sources.get(key);
        if (!existing || row.exam.syllabus !== syllabus) throw new Error("Unexpected or duplicate archive source.");
        const parsed = archiveReference(syllabus, row.exam.year, row.exam.examSession, row.exam.paper, row.exam.questionNumber);
        const original = existing.references[0];
        if (parsed.syllabus !== original.syllabus || parsed.year !== original.year || parsed.session !== original.session
            || parsed.paperCode !== original.paperCode || parsed.printed !== original.printed || parsed.printedPart !== existing.printedPart) {
          throw new Error("Archive source exam reference changed.");
        }
        const items = grouped.get(existing.questionId) ?? [];
        items.push({ source: row, part: existing.printedPart });
        grouped.set(existing.questionId, items);
        sources.delete(key);
      }
    }
  }
  if (sources.size || grouped.size !== metadata.questions.length) throw new Error("Incomplete statement export.");
  return grouped;
}

export async function examArchiveInternalPlan(root: string, legacyMediaMap?: string) {
  const { archive } = await examArchivePlan(root);
  const grouped = await loadSourceContent(root, archive);
  const mapped = new Map<number, Asset[]>();
  if (legacyMediaMap) {
    const records = mappedMediaSchema.parse(JSON.parse((await readFile(legacyMediaMap, "utf8")).replace(/^\uFEFF/, "")));
    const ids = new Set(archive.sources.map(source => source.sourceKey));
    for (const { legacyId: id, role, url } of records) {
      if (!ids.has("maths4u:problems:" + id) || !archivedMaths4uAsset(url)) throw new Error("Legacy media map contains unrecognised entries.");
      const rows = mapped.get(id) ?? [];
      rows.push({ role, source_url: url, available: true });
      mapped.set(id, rows);
    }
  }
  const rows = archive.questions.map(question => {
    const items = grouped.get(question.id)!;
    // The source IDs determine stable presentation and preserve every printed split part.
    items.sort((left, right) => {
      const partOrder = (left.part ?? "").localeCompare(right.part ?? "", "en", { numeric: true });
      return partOrder || left.source.id - right.source.id;
    });
    return makeInternalContent(question.id, items, mapped);
  });
  const stats = {
    questions: rows.length,
    sourceRows: archive.sources.length,
    questionsWithMultipleSourceRows: [...grouped.values()].filter(items => items.length > 1).length,
    statements: rows.filter(row => row.statementHtml.length).length,
    solutions: rows.filter(row => row.solutionHtml !== null).length,
    diagramLinks: rows.reduce((count, row) => count + row.images.length, 0),
    solutionDiagramLinks: rows.reduce((count, row) => count + row.solutionImages.length, 0),
    markSchemeLinks: rows.reduce((count, row) => count + row.markSchemes.length, 0),
  };
  const serialised = JSON.stringify(rows);
  const hash = createHash("sha256").update(serialised).digest("hex");
  return { hash, rows, sources: archive.sources, questions: archive.questions, stats, bytes: Buffer.byteLength(serialised) };
}
