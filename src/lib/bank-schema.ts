import { z } from "zod";
import { taskSchema } from "./content";

export const bankHash = z.string().regex(/^[a-f0-9]{64}$/);
export const bankKey = z.string().regex(/^(assets|structure|tasks)-\d{4}$/);
export const bankCourseKey = z.enum(["0606", "9231-fp1", "9231-fp2", "9231-mechanics", "9231-statistics"]);
const title=z.string().min(1).max(191), locale=z.enum(["en","ru"]);
const course={key:bankCourseKey,sourceId:z.string().regex(/^\d+$/),title,description:z.string().max(1000),position:z.number().int().min(0).max(4),groupLabel:z.string().max(100).nullable()};
export const bankManifestSchema=z.object({format:z.literal("maths4u-bank-v1"),selection:z.literal("0606-9231-five-courses"),courses:z.array(z.object({...course,chapterCount:z.number().int().min(1).max(100)})).length(5),tasks:z.number().int().min(1).max(10000),files:z.number().int().min(0).max(20000),bytes:z.number().int().min(0).max(5*1024**3),batches:z.array(z.object({key:bankKey,kind:z.enum(["assets","structure","tasks"]),sha256:bankHash,count:z.number().int().min(1).max(100)})).min(1).max(4000)}).superRefine((m,c)=>{if(new Set(m.courses.map(x=>x.key)).size!==5||new Set(m.batches.map(x=>x.key)).size!==m.batches.length||m.batches.some(x=>!x.key.startsWith(x.kind+"-")))c.addIssue({code:"custom",message:"Duplicate or mismatched manifest key"});});
export const bankAssetSchema=z.object({id:z.string().regex(/^(bank|pilot)_[a-f0-9]{40}$/),sha256:bankHash,size:z.number().int().min(1).max(1024*1024),mimeType:z.enum(["image/png","image/svg+xml"]),file:z.string().regex(/^assets\/[a-f0-9]{64}\.(png|svg)$/),sourceUrl:z.url().refine(s=>{const u=new URL(s);return u.origin==="https://maths4u.sbs"&&(u.pathname.startsWith("/uploads/problems/")||u.pathname==="/problems.php");}),role:z.enum(["STATEMENT","ANSWER","SOLUTION","MARK_SCHEME","HINT"]),origin:z.string().max(500)});
export const bankAssetsSchema=z.array(bankAssetSchema).min(1).max(80);
export const bankStructureSchema=z.array(z.object({...course,chapters:z.array(z.object({key:z.string().regex(/^chapter-\d+$/),title,position:z.number().int(),lessons:z.array(z.object({key:z.string().regex(/^subchapter-\d+$/),title,position:z.number().int(),texts:z.array(z.object({locale,title,body:z.string().max(100000),examples:z.string().max(100000)})).min(1).max(2)})).max(100)})).length(1)})).length(1);
export const bankTasksSchema=z.array(z.object({table:z.enum(["problems","questions"]),id:z.string().regex(/^\d+$/),sourceUrl:z.url().max(500),sourcePublished:z.boolean(),links:z.array(z.object({courseKey:bankCourseKey,chapterKey:z.string().regex(/^chapter-\d+$/),lessonKey:z.string().regex(/^subchapter-\d+$/),position:z.number().int().min(0).max(100000)})).min(1).max(20),material:taskSchema})).min(1).max(5);
export type BankManifest=z.infer<typeof bankManifestSchema>;
export type BankAsset=z.infer<typeof bankAssetSchema>;
export type BankTask=z.infer<typeof bankTasksSchema>[number];
