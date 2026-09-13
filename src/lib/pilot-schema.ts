import { z } from "zod";
import { parseDocument } from "htmlparser2";
import { findAll } from "domutils";
import { renderContent, taskSchema } from "./content";
import { digest } from "./security";

const key = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const locale = z.enum(["ru", "en"]);
const sourceUrl = z.url().refine(value => { const u = new URL(value); return u.protocol === "https:" && ["maths4u.sbs", "olymp.maths4u.sbs"].includes(u.hostname) && !u.username && !u.password; });
const texts = z.array(z.object({ locale, title: z.string().min(1).max(191), description: z.string().max(10000).default(""), body: z.string().max(100000).default("") })).min(1).max(2)
  .refine(rows => new Set(rows.map(r => r.locale)).size === rows.length);
const sectionSchema = z.object({ project: z.enum(["maths4u", "olymp"]), key, sourceUrl,
  course: z.object({ key, texts }), topic: z.object({ key, position: z.number().int().nonnegative(), texts }), lesson: z.object({ key, texts }),
  records: z.array(z.object({ id: key, position: z.number().int().nonnegative(), sourceUrl, metadata: z.record(z.string(), z.unknown()), material: taskSchema })).min(1).max(100) });
export const bundleSchema = z.object({ format: z.literal("maths4u-pilot-v1"), selection: key, sections: z.array(sectionSchema).min(1).max(2),
  assets: z.array(z.object({ key: z.string().regex(/^[a-f0-9]{40}$/), file: z.string().regex(/^assets\/[a-f0-9]{64}\.png$/), sha256: z.string().regex(/^[a-f0-9]{64}$/),
    size: z.number().int().positive().max(8 * 1024 * 1024), mimeType: z.literal("image/png"), role: z.enum(["STATEMENT", "SOLUTION", "HINT", "TEACHER"]),
    project: z.enum(["maths4u", "olymp"]), legacyId: key, locale, caption: z.string().max(500) })).max(200) });


export type PilotBundle = z.infer<typeof bundleSchema>;
export const pilotId = (kind: string, project: string, key: string) => "pilot_" + digest(`${kind}:${project}:${key}`).slice(0, 40);
export function validatePilot(input: unknown) {
  const bundle = bundleSchema.parse(input);
  const recordKeys = bundle.sections.flatMap(s => s.records.map(r => `${s.project}:${r.id}`));
  if (new Set(recordKeys).size !== recordKeys.length || new Set(bundle.assets.map(a => a.key)).size !== bundle.assets.length) throw new Error("PILOT_DUPLICATE_SOURCE_ID");
  const used = new Set<string>();
  for (const section of bundle.sections) {
    if (new Set(section.records.map(r => r.position)).size !== section.records.length) throw new Error("PILOT_DUPLICATE_POSITION");
    for (const row of section.records) {
      if (row.material.visibility !== "PRIVATE" || row.material.topicIds.length || row.material.featureKey) throw new Error("PILOT_MUST_BE_PRIVATE");
      for (const a of row.material.assets) {
        const asset = bundle.assets.find(x => "pilot_" + x.key === a.fileId && x.project === section.project && x.legacyId === row.id && x.role === a.role && x.locale === a.locale);
        if (!asset) throw new Error("PILOT_ASSET_LINK_MISMATCH");
        used.add(asset.key);
      }
      for (const text of row.material.texts) for (const field of ["statement", "hint", "solution", "teacherNote"] as const) {
        const role = ({ statement: "STATEMENT", hint: "HINT", solution: "SOLUTION", teacherNote: "TEACHER" } as const)[field];
        const html = renderContent(text[field]);
        if (html.includes('class="katex-error"')) throw new Error("PILOT_FORMULA_RENDER_ERROR");
        const references = findAll(n => n.name === "img", parseDocument(text[field]).children);
        for (const image of references) {
          const src = image.attribs.src;
          if (!row.material.assets.some(a => src === "/api/files/" + a.fileId && a.role === role && a.locale === text.locale)) throw new Error("PILOT_INLINE_ASSET_ROLE_MISMATCH");
        }
        if ((html.match(/<img\b/g) || []).length !== references.length) throw new Error("PILOT_IMAGE_REMOVED");
      }
    }
    for (const text of section.lesson.texts) if (renderContent(text.body).includes('class="katex-error"') || /<img\b/i.test(text.body)) throw new Error("PILOT_THEORY_REQUIRES_REVIEW");
  }
  if (used.size !== bundle.assets.length) throw new Error("PILOT_UNLINKED_ASSET");
  return bundle;
}
