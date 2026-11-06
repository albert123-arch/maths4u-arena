import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyTask, type Provenance } from "../src/lib/content-origin";
import { cambridgeTask } from "../src/lib/cambridge-access";
import { archiveAdmin, archiveWhere, unavailableVersion, approvedWhere } from "../src/lib/content-access";
import { inRequestView } from "../src/lib/request-view";
import type { Actor } from "../src/lib/security";
const v:Provenance={source:"Cambridge",materialCategory:"EXAM",examBoard:"Cambridge",syllabus:"0606",year:2025,examSession:"June",paper:"13",questionNumber:"1",sourceUid:"0606_s25_qp_13_q1",sourceReference:null,titles:["June 2025 p13 q1"]};
test("H1 exact source or board remains decisive even with incomplete or historical metadata",()=>{
  assert.equal(classifyTask([v]).origin,"CAMBRIDGE_EXAM");
  assert.equal(classifyTask([{...v,materialCategory:"UNKNOWN",sourceUid:null},v]).origin,"CAMBRIDGE_EXAM");
  assert.equal(classifyTask([{...v,source:null}]).origin,"CAMBRIDGE_EXAM");
  assert.equal(classifyTask([{...v,year:null,paper:null,questionNumber:null}]).origin,"CAMBRIDGE_EXAM");
});
const original:Provenance={...v,source:"Maths4U Original · Quadratics 2026",examBoard:null,syllabus:null,year:null,paper:null,questionNumber:null,sourceUid:"M4U-9709-Q26-E-CS01",sourceReference:"owner-supplied original package; not an official Cambridge question"};
test("original exam-style work is not archived by the word Cambridge or EXAM category",()=>{
  assert.equal(classifyTask([original]).origin,"ORIGINAL");
  assert.equal(classifyTask([{...original,sourceUid:null}]).origin,"UNKNOWN");
  assert.equal(classifyTask([v,original]).origin,"CAMBRIDGE_EXAM");
});
test("olympiad imports and local demos stay UNKNOWN; a named external source is distinct",()=>{
  assert.equal(classifyTask([{...v,source:"Olymp / Book 2. Olympiad Number Theory Methods",examBoard:null,sourceUid:null,sourceReference:null}]).origin,"UNKNOWN");
  assert.equal(classifyTask([{...original,source:"Local preview demo",sourceUid:"learning-preview-1",sourceReference:null}]).origin,"UNKNOWN");
  assert.equal(classifyTask([{...original,source:"External contest",sourceUrl:"https://example.org/contest",sourceReference:null,sourceUid:null}]).origin,"OTHER_THIRD_PARTY");
});
const admin={id:"admin",roles:[{userId:"admin",role:"ADMIN"}]} as Actor;
test("only an actual admin outside a lens can access archived material",()=>{
  assert.equal(archiveAdmin(admin),true);assert.deepEqual(archiveWhere(null),{examArchivedAt:null,...approvedWhere,NOT:cambridgeTask});
  inRequestView({real:admin,actor:admin,sessionId:"s",lens:{mode:"ROLE",role:"STUDENT",targetId:null,label:"Preview",nonce:"n",expiresAt:"2030-01-01"}},()=>{assert.equal(archiveAdmin(admin),false);assert.deepEqual(archiveWhere(admin),{examArchivedAt:null,...approvedWhere,NOT:cambridgeTask});});
});
test("history placeholder contains no question, solution, source or marking guidance",()=>{
  const projected=unavailableVersion({id:"version",taskId:"task",parts:[{id:"part",kind:"MANUAL",maxPoints:4}]},"en");
  assert.equal(projected.title,"This material is no longer available");assert.equal(projected.unavailable,true);assert.deepEqual(projected.assets,[]);assert.equal(projected.parts[0].maxPoints,4);
  for(const key of ["answer","solution","hint","source","markScheme","teacherNote"])assert.equal(Object.hasOwn(projected,key),false);
});
