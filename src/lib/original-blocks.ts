import { quarantineImportedTask } from "./import-content-policy";
import { cleanAuthoredTitle, cleanAuthoredMarkup } from "./content-text-cleanup";
import { z } from "zod";
import { createTaskVersion, renderContent, taskSchema, versionInclude } from "./content";
import { databaseConfig } from "./database-url";
import { admin, digest, lockUser, transaction, type Actor } from "./security";

export const originalBlocks = {
  "maths4u-original-quadratics": {key:"quadratics", chapterId:"orig_9709_p1_quadratics", slug:"quadratics", title:"Quadratics · Maths4U Original", position:0, prefix:"M4U-ORIG-QUAD-", skills:{factorisation:11,"completing-square":12,roots:18,inequalities:17,simultaneous:14}},
  "maths4u-original-functions": {key:"functions", chapterId:"orig_9709_p1_functions", slug:"functions", title:"Functions · Maths4U Original", position:1, prefix:"M4U-ORIG-FUNC-", skills:{inverse:27,composite:28,"restricted-inverse":29,"inverse-graphs":30,transformations:31}},
  "maths4u-original-coordinate-geometry": {key:"coordinate-geometry",chapterId:"orig_9709_p1_coordinate_geometry",slug:"coordinate-geometry",title:"Coordinate Geometry · Maths4U Original",position:2,prefix:"M4U-ORIG-COORD-",skills:{"distance-midpoint":36,"parallel-perpendicular":37,"straight-lines":38,circles:39,"line-circle":40}},
  "maths4u-original-circular-measure": {key:"circular-measure",chapterId:"orig_9709_p1_circular_measure",slug:"circular-measure",title:"Circular Measure · Maths4U Original",position:3,prefix:"M4U-ORIG-CIRC-",skills:{radians:52,"arc-length":53,"sector-area":53,segments:55,"composite-sectors":55}},
  "maths4u-original-trigonometry": {key:"trigonometry",chapterId:"orig_9709_p1_trigonometry",slug:"trigonometry",title:"Trigonometry · Maths4U Original",position:4,prefix:"M4U-ORIG-TRIG-",skills:{ratios:62,graphs:63,identities:66,equations:65,"quadratic-equations":61}},
  "maths4u-original-series": {key:"series",chapterId:"orig_9709_p1_series",slug:"series",title:"Series · Maths4U Original",position:5,prefix:"M4U-ORIG-SER-",skills:{arithmetic:69,geometric:70,"trig-arithmetic":71,"trig-geometric":72,applications:73}},
  "maths4u-original-binomial-expansion": {key:"binomial-expansion",chapterId:"orig_9709_p1_binomial_expansion",slug:"binomial-expansion",title:"Binomial Expansion · Maths4U Original",position:6,prefix:"M4U-ORIG-BIN-",skills:{expansion:74,"general-term":75,products:75,parameters:76,approximations:77}},
  "maths4u-original-differentiation": {key:"differentiation",chapterId:"orig_9709_p1_differentiation",slug:"differentiation",title:"Differentiation · Maths4U Original",position:7,prefix:"M4U-ORIG-DIFF-",skills:{derivatives:78,"tangents-normals":80,"curve-behaviour":81,rates:82,optimisation:83}},
  "maths4u-original-integration": {key:"integration",chapterId:"orig_9709_p1_integration",slug:"integration",title:"Integration · Maths4U Original",position:8,prefix:"M4U-ORIG-INT-",skills:{"power-integrals":84,"curve-equations":85,areas:86,volumes:87,accumulation:88}},
  "maths4u-original-cross-topic-revision": {key:"cross-topic-revision",chapterId:"orig_9709_p1_cross_topic_revision",slug:"cross-topic-revision",title:"Cross-Topic Revision · Maths4U Original",position:9,prefix:"M4U-ORIG-REV-",skills:{"algebra-functions":197,"geometry-calculus":197,"trig-sectors":197,"sequences-binomial":197,"calculus-models":197}},
} as const;

const criterion = z.object({ id: z.string().min(1), marks: z.number().int().positive(), requirement: z.string().min(1) });
const part = z.object({ label: z.string().regex(/^[a-z]$/), prompt_html: z.string().min(1), answer_html: z.string().min(1), solution_html: z.string().min(1),
  criteria: z.array(criterion).min(1), marks: z.number().int().positive(), alternative_methods: z.string().min(1), common_error: z.string().min(1) });
const problem = z.object({ uid: z.string().regex(/^M4U-ORIG-(QUAD|FUNC|COORD|CIRC|TRIG|SER|BIN|DIFF|INT|REV)-\d{3}$/), version: z.literal(1), skill: z.string(), title: z.string().min(1), objective: z.string().min(1),
  difficulty: z.number().int().min(1).max(5), stem_html: z.string().min(1), hint_html: z.string().min(1), parts: z.array(part).length(3), marks: z.number().int().positive() });
export const originalBlockSchema = z.object({ schema_version: z.literal(1), key: z.enum(["maths4u-original-quadratics","maths4u-original-functions","maths4u-original-coordinate-geometry","maths4u-original-circular-measure","maths4u-original-trigonometry","maths4u-original-series","maths4u-original-binomial-expansion","maths4u-original-differentiation","maths4u-original-integration","maths4u-original-cross-topic-revision"]), version: z.literal("2026-10-30.1"),
  language: z.literal("en"), title: z.string(), syllabus: z.literal("9709"), component: z.string(),
  provenance: z.object({ classification: z.literal("original"), prepared_by: z.string(), basis: z.string(), third_party_question_text: z.literal(false), teacher_review: z.literal("pending"), verification: z.string() }),
  marking_policy: z.string().min(1), lessons: z.array(z.object({ key: z.string().regex(/^[a-z-]+$/), php_subchapter_id: z.number().int(), title: z.string(), objective: z.string(), notes_html: z.string().min(1),
    examples: z.array(z.object({ question_html: z.string().min(1), solution_html: z.string().min(1) })).length(3), common_mistakes: z.array(z.string()).min(1) })).length(5), problems: z.array(problem).length(10),
}).superRefine((pack, ctx) => {
  const spec=originalBlocks[pack.key];
  const expected:Record<string,number>=spec.skills;
  if(pack.lessons.some(l=>expected[l.key]!==l.php_subchapter_id)||pack.problems.some(p=>!p.uid.startsWith(spec.prefix)))ctx.addIssue({code:"custom",message:"Editorial block or topic mapping mismatch"});
  const keys = new Set(pack.lessons.map(l => l.key));
  if (keys.size !== 5 || new Set(pack.problems.map(p => p.uid)).size !== 10) ctx.addIssue({ code: "custom", message: "Duplicate editorial identity" });
  const ids = pack.problems.flatMap(p => p.parts.flatMap(a => a.criteria.map(c => c.id)));
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Duplicate criterion identity" });
  for (const p of pack.problems) {
    if(p.parts.some((a,i)=>a.label!==String.fromCharCode(97+i)||a.criteria.some(c=>!c.id.startsWith(p.uid+":"+a.label+":"))))ctx.addIssue({code:"custom",message:"Criterion or part identity mismatch"});
    if (!keys.has(p.skill) || p.marks !== p.parts.reduce((n,a) => n+a.marks,0) || p.parts.some(a => a.marks !== a.criteria.reduce((n,c) => n+c.marks,0))) ctx.addIssue({ code: "custom", message: "Invalid skill or mark total" });
  }
  for (const key of keys) if (pack.problems.filter(p => p.skill === key).length !== 2) ctx.addIssue({ code: "custom", message: "Two problems per skill required" });
});
export type OriginalBlock = z.infer<typeof originalBlockSchema>;
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export const originalCourseId = "orig_9709_p1";
export const originalChapterId = (pack:OriginalBlock) => originalBlocks[pack.key].chapterId;
export const originalLessonId = (block:OriginalBlock["key"],key: string) => "orig_"+originalBlocks[block].key.replaceAll("-","_")+"_"+key.replaceAll("-", "_");
export function originalLessonText(l: OriginalBlock["lessons"][number]) {
  const body=`<p><strong>Maths4U Original</strong> · ${esc(l.objective)}</p>${l.notes_html}<h3>Common mistakes</h3><ul>${l.common_mistakes.map(m=>`<li>${esc(m)}</li>`).join("")}</ul><p>AI-assisted preparation from independent skill briefs. Teacher editorial review is pending.</p>`;
  const examples=l.examples.map((e,i)=>`<h3>Example ${i+1}</h3><p>${e.question_html}</p>${e.solution_html}`).join("");
  return {locale:"en" as const,title:cleanAuthoredTitle(l.title),body:cleanAuthoredMarkup(body),examples};
}
export function originalRubric(p: OriginalBlock["problems"][number]["parts"][number]) {
  return `<h4>(${p.label}) · ${p.marks} marks</h4><ul>` + p.criteria.map(c => `<li><strong>${esc(c.id)} · ${c.marks} mark(s):</strong> ${esc(c.requirement)}</li>`).join("") +
    `</ul><p><strong>Alternative methods:</strong> ${esc(p.alternative_methods)}</p><p><strong>Common error:</strong> ${esc(p.common_error)}</p>`;
}
export function originalTask(pack: OriginalBlock, p: OriginalBlock["problems"][number]) {
  const guidance = `<p>${esc(pack.marking_policy)}</p>` + p.parts.map(originalRubric).join("");
  return taskSchema.parse({ visibility: "PUBLIC", featureKey: null, difficulty: p.difficulty, difficultyKnown: true, materialCategory: "EXAM",
    source: "Maths4U Original (AI-assisted)", syllabus: "9709", qualification: "AS & A Level Mathematics", component: "Pure 1",
    sourceUid: p.uid, sourceReference: `${p.uid} v${p.version}; original exam-style problem; teacher editorial review pending`, topicIds: [originalChapterId(pack)],
    texts: [{ locale: "en", title: cleanAuthoredTitle(p.title), statement: p.stem_html,
      hint: p.hint_html, answer: p.parts.map(a => `<p>(${a.label}) ${a.answer_html}</p>`).join(""),
      solution: p.parts.map(a => `<h3>(${a.label})</h3>${a.solution_html}`).join(""), markScheme: guidance,
      markSchemeSource: "Maths4U indicative guidance; not an official examination-board mark scheme", markSchemeText: guidance, markSchemeStatus: "DRAFT",
      teacherNote: `${p.objective}\n${JSON.stringify({ editorialUid:p.uid, version:p.version, provenance:pack.provenance, criteria:p.parts.map(a => ({label:a.label, marks:a.marks, criteria:a.criteria})) })}` }],
    parts: p.parts.map(a => ({ kind: "MANUAL", maxPoints: a.marks, texts: [{ locale: "en", prompt: `(${a.label}) ${a.prompt_html}`, answer: a.answer_html, rubric: originalRubric(a) }] })),
  });
}

/** Additive local importer. Never loads a production config or changes legacy identities. */
export async function importOriginalBlockLocal(actor: Actor, input: unknown) {
  const cfg = databaseConfig();
  if (process.env.MATHS4U_ENV !== "test" || cfg.host !== "127.0.0.1" || !cfg.database.startsWith("maths4u_test_bank_")) throw new Error("ORIGINAL_LOCAL_ONLY");
  admin(actor);
  const pack = originalBlockSchema.parse(input);
  const spec=originalBlocks[pack.key],chapterId=originalChapterId(pack);
  const tasks = pack.problems.map(p => ({p, material: originalTask(pack,p)}));
  for (const l of pack.lessons) for (const html of [l.notes_html, ...l.examples.flatMap(e => [e.question_html,e.solution_html])])
    if (renderContent(html).includes('class="katex-error"')) throw new Error("ORIGINAL_INVALID_MATH");
  for (const {material} of tasks) for (const html of [...material.texts.flatMap(t => [t.statement,t.hint,t.solution,t.markScheme]), ...material.parts.flatMap(p => p.texts.flatMap(t => [t.prompt,t.answer,t.rubric]))])
    if (renderContent(html).includes('class="katex-error"')) throw new Error("ORIGINAL_INVALID_MATH");
  return transaction(async tx => {
    await lockUser(tx,actor.id);
    const course = await tx.course.findUnique({where:{slug:"maths4u-9709-p1"}});
    if (course && course.id !== originalCourseId) throw new Error("ORIGINAL_COURSE_COLLISION");
    if (!course) await tx.course.create({data:{id:originalCourseId,slug:"maths4u-9709-p1",published:true,position:60,groupLabel:"AS & A Level Mathematics",texts:{create:{locale:"en",title:"Pure Mathematics 1 (9709)",description:"Maths4U Original pilot: Quadratics notes, examples and independently prepared exam-style problems. Indicative marking guidance included."}}}});
    const chapter = await tx.topic.findUnique({where:{id:chapterId}});
    if (chapter && (chapter.courseId !== originalCourseId || chapter.slug !== spec.slug)) throw new Error("ORIGINAL_CHAPTER_COLLISION");
    if (!chapter) await tx.topic.create({data:{id:chapterId,courseId:originalCourseId,slug:spec.slug,position:spec.position,texts:{create:{locale:"en",title:spec.title}}}});
    const mapping: Record<string,string> = {};let created=0,skipped=0;
    for (const {p,material} of tasks) {
      const key={sourceProject:"maths4u",legacyId:"original:"+p.uid};
      const hash=digest(JSON.stringify(material));
      const existing=await tx.importRecord.findUnique({where:{sourceProject_legacyId:key}});
      if(existing){
        if(existing.contentHash!==hash)throw new Error("ORIGINAL_EXPLICIT_VERSION_MIGRATION_REQUIRED");
        // Import hashes alone cannot detect later edits through another route.
        const task=await tx.task.findUniqueOrThrow({where:{id:existing.taskId},include:{topics:true,versions:{orderBy:{number:"desc"},include:versionInclude}}});
        const v=task.versions[0];
        const metadata=["difficulty","difficultyKnown","materialCategory","syllabus","examBoard","year","examSession","paper","questionNumber","sourceReference","sourceUid","component","seriesCode","qualification"] as const;
        const textsMatch=(expected: {locale:string}[],actual:{locale:string}[])=>expected.length===actual.length&&expected.every(t=>{
          const row=actual.find(r=>r.locale===t.locale);return row&&Object.entries(t).every(([key,value])=>row[key as keyof typeof row]===value);
        });
        if(task.visibility!=="PUBLIC"||task.featureKey!==null||task.archivedAt||!v||v.number<1||
          v.source?.name!==material.source||metadata.some(key=>(v[key]??undefined)!==material[key])||v.assets.length||
          task.topics.length!==1||task.topics[0].topicId!==chapterId||!textsMatch(material.texts,v.texts)||v.parts.length!==material.parts.length||
          material.parts.some((a,i)=>{const b=v.parts[i];return b.kind!==a.kind||b.maxPoints!==a.maxPoints||b.acceptedAnswers.length||b.options.length||!textsMatch(a.texts,b.texts);}))throw new Error("ORIGINAL_MAPPING_CHANGED");
        await quarantineImportedTask(tx,existing.taskId,true);mapping[p.uid]=existing.taskId;skipped++;
      }else{
        if(await tx.taskVersion.count({where:{sourceUid:p.uid}}))throw new Error("ORIGINAL_IDENTITY_COLLISION");
        const v=await createTaskVersion(tx,actor,material);
        await tx.importRecord.create({data:{...key,taskId:v.taskId,contentHash:hash}});
        mapping[p.uid]=v.taskId;created++;
      }
    }
    for (const [position,l] of pack.lessons.entries()) {
      const id=originalLessonId(pack.key,l.key),old=await tx.lesson.findUnique({where:{id},include:{versions:{orderBy:{number:"desc"},take:1,include:{texts:true}}}});
      const text=originalLessonText(l),{body,examples}=text;
      if(old){
        const previous=old.versions[0]?.texts.find(t=>t.locale==="en");
        if(old.topicId!==chapterId||old.archivedAt||!previous||previous.title!==text.title||previous.body!==body||previous.examples!==examples)throw new Error("ORIGINAL_LESSON_CHANGED");
      }else{
        await tx.lesson.create({data:{id,topicId:chapterId,position,versions:{create:{number:1,texts:{create:text}}}}});
      }
      for(const [position,p] of pack.problems.filter(p=>p.skill===l.key).entries()) await tx.lessonTask.upsert({where:{lessonId_taskId:{lessonId:id,taskId:mapping[p.uid]}},create:{lessonId:id,taskId:mapping[p.uid],position},update:{}});
    }
    return {created,skipped,course:"/courses/maths4u-9709-p1",mapping};
  });
}
