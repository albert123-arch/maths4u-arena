import test from "node:test";import assert from "node:assert/strict";
import {db} from "../src/lib/prisma";import {userSelect} from "../src/lib/security";import {versionInclude,publicVersion} from "../src/lib/content";import {automaticPoints} from "../src/lib/works";
import {pure1VariantsPack,pure1VariantsSchema,importPure1VariantsLocal} from "../src/lib/pure1-variants";
import {familyReviewItems,restoreFamilyReviews,nextReview,reviewQueue} from "../src/lib/pure1-review-policy.mjs";
test("fresh variants preserve identities, keys and grading; family rotation is unseen then least recent",async()=>{
 const actor=await db().user.findFirstOrThrow({where:{status:"ACTIVE",roles:{some:{role:"ADMIN"}}},select:userSelect}),before=await db().taskVersion.count();
 const result=await importPure1VariantsLocal(actor,pure1VariantsPack);assert.equal(result.created,0);assert.equal(result.skipped,208);
 for(const q of pure1VariantsPack.questions){if(q.kind!=="NUMERIC")throw Error("Numeric variant required");const t=await db().task.findUniqueOrThrow({where:{id:result.mapping[q.uid]},include:{versions:{include:versionInclude}}});assert.equal(t.versions.length,1);const v=t.versions[0],p=v.parts[0];assert.equal(p.kind,"NUMERIC");assert.ok(v.texts[0].teacherNote.includes(q.family_uid));
  assert.equal(automaticPoints(p,{value:q.answer},q.uid),1);assert.equal(automaticPoints(p,{value:String(p.numericAnswer!+.01)},q.uid),0);assert.equal(automaticPoints(p,{value:"1+1"},q.uid),0);
  const publicDto=publicVersion(v,"en");for(const key of ["answer","solution","teacherNote","arithmetic_witness"])assert.ok(!(key in publicDto));assert.ok(!("numericAnswer" in publicDto.parts[0]));
 }
 const q=pure1VariantsPack.questions[0],items=[{uid:q.family_uid,family_uid:q.family_uid,block:q.block,skill:q.skill,title:q.title,href:"/original",notesHref:"/notes"},{uid:q.uid,family_uid:q.family_uid,block:q.block,skill:q.skill,title:q.title,href:"/variant",notesHref:"/notes"}];
 const failed=nextReview(null,{at:1000,correct:false,helpUsed:false});let pick=familyReviewItems(items,{[q.family_uid]:failed});assert.equal(pick[0].variant_uid,q.uid);assert.deepEqual(pick,familyReviewItems(items,{[q.family_uid]:failed}),"Reload is stable");
 const own={[q.family_uid]:failed,[q.uid]:nextReview(null,{at:2000,correct:true,helpUsed:false})};pick=familyReviewItems(items,own);assert.equal(pick[0].variant_uid,q.family_uid);
 const families=restoreFamilyReviews(items,own);assert.ok(families[q.family_uid].correct);assert.ok(families[q.family_uid].hadError);assert.equal(reviewQueue(pick,families,3000)[0].due,0);
 assert.ok(!own[q.family_uid].correct,"Old result is not overwritten");assert.equal(families[q.family_uid].streak,1);
 const bad=structuredClone(pure1VariantsPack);bad.questions[0].family_uid="unknown";assert.throws(()=>pure1VariantsSchema.parse(bad));const changed=structuredClone(pure1VariantsPack);changed.questions[0].prompt_html+=" changed";await assert.rejects(importPure1VariantsLocal(actor,changed),/P1_SHORT_EXPLICIT_REVISION_REQUIRED/);assert.equal(await db().taskVersion.count(),before);
}).finally(()=>db().$disconnect());
