import { z } from "zod";
import { admin, digest, lockUser, transaction, type Actor } from "./security";
import { databaseConfig } from "./database-url";
import { createTaskVersion, renderContent, taskSchema, versionInclude } from "./content";
import { originalBlocks, originalLessonId } from "./original-blocks";
import { pure1PracticeNumber } from "./pure1-practice-number";

const base={uid:z.string().max(150),version:z.literal(1),block:z.string(),skill:z.string(),php_subchapter_id:z.number().int(),title:z.string(),stage:z.string(),prompt_html:z.string().min(1),hint_html:z.string().min(1),solution_html:z.string().min(1),focus:z.string().min(1)};
export const pure1ShortQuestionSchema=z.discriminatedUnion("kind",[
  z.object({...base,kind:z.literal("NUMERIC"),answer:z.string().refine(v=>pure1PracticeNumber(v)!==null),options:z.array(z.string()).length(0),tolerance:z.literal(0.000001)}),
  z.object({...base,kind:z.literal("CHOICE"),options:z.array(z.string().min(1)).length(4),correct_option:z.number().int().min(0).max(3)})
]);
export const pure1ShortSchema=z.object({schema_version:z.literal(1),key:z.literal("maths4u-pure1-short-practice"),version:z.literal("2026-10-30.1"),language:z.literal("en"),syllabus:z.literal("9709"),component:z.literal("Pure 1"),
  provenance:z.object({classification:z.literal("original"),prepared_by:z.string(),basis:z.string(),third_party_question_text:z.literal(false),teacher_review:z.literal("pending"),verification:z.string()}),grading_policy:z.string(),questions:z.array(pure1ShortQuestionSchema).length(208)
}).superRefine((p,ctx)=>{
 const counts=new Map<string,number>(),uids=new Set<string>();
 for(const q of p.questions){const spec=Object.values(originalBlocks).find(b=>b.key===q.block),skills:Record<string,number>=spec?.skills??{},group=q.block+":"+q.skill;
  if(skills[q.skill]!==q.php_subchapter_id||!new RegExp("^M4U-P1-QP-"+q.block.toUpperCase()+"-"+q.skill.toUpperCase()+"-0[1-6]$").test(q.uid)||uids.has(q.uid)||(q.kind==="CHOICE"&&new Set(q.options).size!==4))ctx.addIssue({code:"custom",message:"Invalid practice identity or mapping"});
  counts.set(group,(counts.get(group)??0)+1);uids.add(q.uid);
 }if(counts.size!==50||[...counts.values()].some(n=>n<4||n>6))ctx.addIssue({code:"custom",message:"Four to six checks per skill required"});
});
export type Pure1ShortPack=z.infer<typeof pure1ShortSchema>;
export function pure1ShortTask(pack:Pick<Pure1ShortPack,"provenance"|"grading_policy">,q:Pure1ShortPack["questions"][number]){
 const spec=Object.values(originalBlocks).find(b=>b.key===q.block)!;
 const answer=q.kind==="NUMERIC"?q.answer:q.options[q.correct_option];
 const instruction=q.kind==="NUMERIC"?"Enter one number or fraction. Round decimals to at least six decimal places when needed.":"Choose one answer.";
 return taskSchema.parse({visibility:"PUBLIC",featureKey:null,materialCategory:"TRAINING",difficulty:1,difficultyKnown:false,source:"Maths4U Original (AI-assisted)",syllabus:"9709",component:"Pure 1",qualification:"AS & A Level Mathematics",sourceUid:q.uid,sourceReference:`${q.uid} v1; original short practice; teacher editorial review pending`,topicIds:[spec.chapterId],
  texts:[{locale:"en",title:q.title,statement:`<p><strong>Maths4U Original · Short practice · ${q.stage}</strong></p>${q.prompt_html}<p>${instruction}</p>`,hint:q.hint_html,answer,solution:q.solution_html,teacherNote:JSON.stringify({editorialUid:q.uid,version:q.version,focus:q.focus,...("family_uid" in q?{familyUid:q.family_uid}:{}),provenance:pack.provenance,gradingPolicy:pack.grading_policy})}],
  parts:[{kind:q.kind,maxPoints:1,...(q.kind==="NUMERIC"?{numericAnswer:pure1PracticeNumber(q.answer)!,tolerance:q.tolerance}:{}),texts:[{locale:"en",prompt:"",answer,rubric:"One point for the correct final answer. Written reasoning is not assessed in this short check."}],options:q.kind==="CHOICE"?q.options.map((text,i)=>({correct:i===q.correct_option,texts:[{locale:"en",text}]})):[]}]
 });
}

/** Additive importer for the existing isolated local course. No lesson or task revisions. */
export async function importPure1ShortLocal(actor:Actor,input:unknown){
 return importPure1PracticeMaterialsLocal(actor,pure1ShortSchema.parse(input),false);
}
/** Internal shared writer; public entry points validate their own complete editorial pack first. */
export async function importPure1PracticeMaterialsLocal(actor:Actor,pack:Pick<Pure1ShortPack,"provenance"|"grading_policy"|"questions">,variants:boolean){
 const cfg=databaseConfig();if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||!cfg.database.startsWith("maths4u_test_bank_"))throw Error("P1_SHORT_LOCAL_ONLY");admin(actor);
 const materials=pack.questions.map(q=>({q,material:pure1ShortTask(pack,q)}));
 for(const {material}of materials)for(const text of [...material.texts.flatMap(t=>[t.statement,t.hint,t.solution,t.answer??""]),...material.parts.flatMap(p=>p.options.flatMap(o=>o.texts.map(t=>t.text)))])if(renderContent(text).includes('class="katex-error"'))throw Error("P1_SHORT_INVALID_MATH");
 return transaction(async tx=>{
  await lockUser(tx,actor.id);let created=0,skipped=0;const mapping:Record<string,string>={};
  const textsMatch=(expected:{locale:string}[],actual:{locale:string}[])=>expected.length===actual.length&&expected.every(t=>{const row=actual.find(r=>r.locale===t.locale);return row&&Object.entries(t).every(([key,value])=>row[key as keyof typeof row]===value);});
  for(const {q,material} of materials){
   const blockKey=("maths4u-original-"+q.block) as keyof typeof originalBlocks,id=originalLessonId(blockKey,q.skill),lesson=await tx.lesson.findUniqueOrThrow({where:{id},include:{topic:{include:{course:true}}}});
   if(lesson.topicId!==material.topicIds[0]||lesson.archivedAt||lesson.topic.course.id!=="orig_9709_p1"||!lesson.topic.course.published||lesson.topic.course.archivedAt)throw Error("P1_SHORT_LESSON_MAPPING");
   const key={sourceProject:"maths4u",legacyId:"short-practice:"+q.uid},hash=digest(JSON.stringify(material));
   const existing=await tx.importRecord.findUnique({where:{sourceProject_legacyId:key}});let taskId:string;
   if(existing){
    if(existing.contentHash!==hash)throw Error("P1_SHORT_EXPLICIT_REVISION_REQUIRED");
    const task=await tx.task.findUniqueOrThrow({where:{id:existing.taskId},include:{topics:true,versions:{orderBy:{number:"desc"},include:versionInclude}}}),v=task.versions[0],a=material.parts[0],b=v?.parts[0];
    if(task.visibility!=="PUBLIC"||task.featureKey||task.archivedAt||task.versions.length!==1||v.number!==1||v.sourceUid!==q.uid||v.source?.name!==material.source||v.materialCategory!=="TRAINING"||v.sourceReference!==material.sourceReference||v.examBoard!==null||v.year!==null||v.difficulty!==material.difficulty||v.difficultyKnown!==material.difficultyKnown||v.syllabus!==material.syllabus||v.component!==material.component||v.qualification!==material.qualification||v.assets.length||task.topics.length!==1||task.topics[0].topicId!==lesson.topicId||!textsMatch(material.texts,v.texts)||v.parts.length!==1||b.kind!==a.kind||b.maxPoints!==1||b.numericAnswer!==(a.numericAnswer??null)||b.tolerance!==a.tolerance||b.caseSensitive!==a.caseSensitive||b.acceptedAnswers.length||!textsMatch(a.texts,b.texts)||b.options.length!==a.options.length||a.options.some((o,i)=>o.correct!==b.options[i].correct||!textsMatch(o.texts,b.options[i].texts)))throw Error("P1_SHORT_MAPPING_CHANGED");
    taskId=task.id;skipped++;
   }else{
    if(await tx.taskVersion.count({where:{sourceUid:q.uid}}))throw Error("P1_SHORT_IDENTITY_COLLISION");
    const v=await createTaskVersion(tx,actor,material);taskId=v.taskId;await tx.importRecord.create({data:{...key,taskId,contentHash:hash}});created++;
   }
   const position=(variants?100:1)+Number(q.uid.slice(-2)),link=await tx.lessonTask.findUnique({where:{lessonId_taskId:{lessonId:id,taskId}}});
   if(link&&link.position!==position)throw Error("P1_SHORT_ORDER_CHANGED");
   if(!link)await tx.lessonTask.create({data:{lessonId:id,taskId,position}});mapping[q.uid]=taskId;
  }return {created,skipped,mapping,skills:50,course:"/courses/maths4u-9709-p1"};
 });
}
