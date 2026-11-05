import {z} from "zod";
import baseRaw from "../../content/original/pure1-short-practice-v1.json";
import variantsRaw from "../../content/original/pure1-review-variants-v1.json";
import {pure1ShortSchema,pure1ShortQuestionSchema,importPure1PracticeMaterialsLocal} from "./pure1-short-practice";
import type {Actor} from "./security";
export const pure1BasePack=pure1ShortSchema.parse(baseRaw);
const parentMap=new Map(pure1BasePack.questions.map(q=>[q.uid,q]));
export const pure1VariantsSchema=z.object({schema_version:z.literal(1),key:z.literal("maths4u-pure1-review-variants"),version:z.literal("2026-10-30.1"),language:z.literal("en"),syllabus:z.literal("9709"),component:z.literal("Pure 1"),provenance:pure1ShortSchema.shape.provenance,grading_policy:z.string(),questions:z.array(z.intersection(pure1ShortQuestionSchema,z.object({family_uid:z.string(),variant_index:z.literal(1),arithmetic_witness:z.string()}))).length(208)}).superRefine((p,ctx)=>{
 const seen=new Set<string>();for(const q of p.questions){const parent=parentMap.get(q.family_uid);if(!parent||seen.has(q.family_uid)||q.kind!=="NUMERIC"||q.uid!==parent.uid.replace("M4U-P1-QP-","M4U-P1-QP-VAR-")||q.block!==parent.block||q.skill!==parent.skill||q.php_subchapter_id!==parent.php_subchapter_id||q.focus!==parent.focus)ctx.addIssue({code:"custom",message:"Invalid variant family or identity"});seen.add(q.family_uid);}
});
export const pure1VariantsPack=pure1VariantsSchema.parse(variantsRaw);
export const allPure1Questions=[...pure1BasePack.questions,...pure1VariantsPack.questions];
export const pure1Family=(q:(typeof allPure1Questions)[number]):string=>"family_uid" in q&&typeof q.family_uid==="string"?q.family_uid:q.uid;
export async function importPure1VariantsLocal(actor:Actor,input:unknown){return importPure1PracticeMaterialsLocal(actor,pure1VariantsSchema.parse(input),true);}
