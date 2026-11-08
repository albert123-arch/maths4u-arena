import { z } from "zod";
const id = z.string().regex(/^[a-zA-Z0-9_-]{2,80}$/);
const html = z.string().min(1).max(100000);
const criterion = z.object({ code: z.string().max(20), marks: z.number().int().positive().max(100), description_html: html, guidance_html: z.string().optional() }).strict();
const field = z.object({ key: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/), label: z.string().min(1), type: z.enum(["number", "polynomial", "expression", "equation", "set", "choice", "pairs", "ratio"]), expected: z.union([z.string(), z.array(z.string())]), variables: z.array(z.string()).max(2).optional(), options: z.record(z.string(), z.string()).optional() }).strict();
const question = z.object({ id, family_uid: id, lesson: id, title: z.string().min(1).max(191), collection: z.enum(["short", "variant", "exam"]),
  prompt_html: html, answer_html: html, solution_html: html, hint_html: html, marks: z.number().int().positive().max(100), difficulty: z.number().int().min(1).max(5),
  fields: z.array(field).max(12), parts: z.array(z.object({ label: z.string().max(20), marking_criteria: z.array(criterion).min(1) }).strict()).min(1),
  provenance: z.object({ original_id: z.string(), original_uid: z.string(), archiveTaskId: z.string(), similarity: z.number().min(0).max(1).optional(), sourceSha256: z.string().length(64), ownerProvenance: z.record(z.string(), z.unknown()) }).strict().optional(),
  verification: z.string().min(1), variant_index: z.number().int().min(0).max(3).optional(),
}).strict();
export const contentPackageSchema = z.object({ schema_version: z.literal(1), key: id, version: z.string().regex(/^\d+\.\d+\.\d+$/),
  course: z.object({ slug: z.string().regex(/^[a-z0-9-]{2,120}$/), title: z.string().min(1), code: z.string(), direction: z.string() }).strict(),
  chapter: z.object({ id, slug: z.string(), title: z.string().min(1), position: z.number().int().nonnegative() }).strict(),
  source: z.object({ sha256: z.string().length(64), supplied: z.number().int(), held: z.array(z.object({ id:z.string(), title:z.string(), reason:z.string(), similarity:z.number() }).strict()) }).strict(),
  lessons: z.array(z.object({ key:id, id, title:z.string().min(1), summary:z.string().min(1), objective:z.string().min(1), before:html, ideas:html, method:html, mistakes:z.array(z.string()).min(3).max(5),
    examples:z.array(z.object({ title:z.string(),question:html,solution:html,verification:z.string() }).strict()).min(3).max(4),
  }).strict()).min(1), questions:z.array(question).min(1), marking_status:z.literal("DRAFT"),
  assets:z.array(z.object({question_uid:id,file_id:id,path:z.string().regex(/^content\/original\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.(png|svg)$/),sha256:z.string().regex(/^[a-f0-9]{64}$/),size:z.number().int().positive().max(8*1024*1024),width:z.number().int().positive().max(10000),height:z.number().int().positive().max(10000),mime:z.enum(["image/png","image/svg+xml"]),role:z.enum(["STATEMENT","SOLUTION"]),caption:z.string().max(500)}).strict()).max(500).optional(),
}).strict().superRefine((p,c)=>{
  const fail=(message:string)=>c.addIssue({code:"custom",message});
  if(new Set(p.questions.map(q=>q.id)).size!==p.questions.length)fail("Duplicate question identity");
  if(new Set(p.lessons.map(l=>l.id)).size!==p.lessons.length||new Set(p.lessons.map(l=>l.key)).size!==p.lessons.length)fail("Duplicate lesson identity");
  const media=p.assets??[];
  if(new Set(media.map(a=>a.file_id)).size!==media.length)fail("Duplicate asset identity");
  for(const a of media){
    if(!p.questions.some(q=>q.id===a.question_uid))fail("Unmapped asset: "+a.file_id);
    if(!a.file_id.startsWith("pkg_")||!a.file_id.endsWith(a.sha256)||!a.path.endsWith("/"+a.sha256+(a.mime==="image/png"?".png":".svg")))fail("Asset hash identity mismatch");
    if(a.width*a.height>40000000)fail("Asset pixel limit");
  }
  for(const q of p.questions.filter(q=>q.variant_index!==undefined)){
    const family=p.questions.filter(r=>r.family_uid===q.family_uid);
    if(q.collection!=="exam"||family.length!==4||new Set(family.map(r=>r.variant_index)).size!==4||family.some(r=>r.lesson!==q.lesson||r.variant_index===undefined))fail("Incomplete exam family: "+q.id);
  }
  for(const q of p.questions){
    if(!p.lessons.some(l=>l.key===q.lesson))fail("Unmapped lesson: "+q.id);
    if(q.parts.flatMap(p=>p.marking_criteria).reduce((s,r)=>s+r.marks,0)!==q.marks)fail("Mark total: "+q.id);
    if(q.collection!=="exam"&&!q.fields.length)fail("Quick check needs a complete answer: "+q.id);
    if(q.fields.some(f=>f.type==='choice'&&(!f.options||typeof f.expected!=='string'||!f.options[f.expected])))fail("Invalid choice: "+q.id);
    for(const text of [q.title,q.prompt_html,q.hint_html,q.solution_html,q.answer_html])if(/Maths4U Original|teacher review pending|AI-assisted|\b(?:June|November)\s+20\d{2}\s+p\d+\s+q\d+/i.test(text))fail("Editorial metadata in teaching content: "+q.id);
  }
  for(const l of p.lessons){const n=p.questions.filter(q=>q.lesson===l.key&&q.collection!=="exam").length;if(n<6||n>10)fail("Each lesson needs 6–10 quick checks: "+l.key);}
});
export type ContentPackage = z.infer<typeof contentPackageSchema>;
export type PackageQuestion = ContentPackage["questions"][number];
