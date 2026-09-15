import assert from 'node:assert/strict';
import {db} from '../src/lib/prisma';
import {digest,type Actor} from '../src/lib/security';
import {beginBank,stageBankBatch,checkBankTasks,applyBankTasks,applyBankStructure,checkBankStructure} from '../src/lib/bank-import';
import {bankManifestSchema} from '../src/lib/bank-schema';
import {pilotId} from '../src/lib/pilot-schema';
import {saveTask,editableVersion,versionInclude,publicVersion} from '../src/lib/content';
import {canonicalJson} from '../src/lib/canonical-json.mjs';

export async function verifyBankFixture(admin:Actor,student:Actor){
  const keys=['0606','9231-fp1','9231-fp2','9231-mechanics','9231-statistics']as const;
  const structures=keys.map((key,i)=>[{key,sourceId:String(i+1),title:'Synthetic bank '+i,description:'Test',position:i,groupLabel:i?'Further Mathematics 9231':null,chapters:[{key:'chapter-'+(9000+i),title:'Chapter',position:1,lessons:[{key:'subchapter-'+(9000+i),title:'Topic',position:1,texts:[{locale:'en',title:'Topic',body:'',examples:''}]}]}]}]);
  const material={visibility:'PRIVATE',texts:[{locale:'en',title:'Source',statement:'Condition',answer:'Answer',solution:'Solution',markSchemeText:'M1: explanation',markSchemeStatus:'OCR_UNVERIFIED'}],parts:[{kind:'MANUAL',maxPoints:2,texts:[{locale:'en',markSchemeText:'A1: result',markSchemeStatus:'SOURCE_TEXT'}]}]};
  const rows=['problems','questions'].map(table=>({table,id:'9000',sourceUrl:'https://maths4u.sbs/',sourcePublished:table==='problems',links:[{courseKey:'0606',chapterKey:'chapter-9000',lessonKey:'subchapter-9000',position:table==='problems'?0:1}],material:structuredClone(material)}));
  const setup=async()=>{const batches=[...structures.map((p,i)=>({key:'structure-000'+(i+1),kind:'structure',sha256:digest(canonicalJson(p)),count:1})),{key:'tasks-0001',kind:'tasks',sha256:digest(canonicalJson(rows)),count:rows.length}];
    const manifest=bankManifestSchema.parse({format:'maths4u-bank-v1',selection:'0606-9231-five-courses',courses:structures.map(([{chapters,...c}])=>({...c,chapterCount:chapters.length})),tasks:rows.length,files:0,bytes:0,batches});
    await assert.rejects(beginBank(student,{manifest}),/FORBIDDEN/);const {runId}=await beginBank(admin,{manifest,publishNew:true});
    for(const [i,payload]of structures.entries())await stageBankBatch(admin,{runId,key:batches[i].key,payload});await stageBankBatch(admin,{runId,key:'tasks-0001',payload:rows});return {runId,key:'tasks-0001'};};
  const first=await setup();const plan=await checkBankTasks(admin,first);assert.equal(plan.created,2);
  assert.equal(await db().course.count({where:{id:pilotId('course','maths4u','0606')}}),0);
  for(let i=1;i<=5;i++){const request={runId:first.runId,key:'structure-000'+i};const dry=await checkBankStructure(admin,request);assert.equal(dry.items.length,3);await applyBankStructure(admin,request);}
  await applyBankTasks(admin,{...first,fingerprint:plan.fingerprint});await assert.rejects(applyBankTasks(admin,{...first,fingerprint:plan.fingerprint}),/BANK_STALE_DRY_RUN/);
  const p=await db().importRecord.findUniqueOrThrow({where:{sourceProject_legacyId:{sourceProject:'maths4u',legacyId:'problems:9000'}}}),q=await db().importRecord.findUniqueOrThrow({where:{sourceProject_legacyId:{sourceProject:'maths4u',legacyId:'questions:9000'}}});assert.notEqual(p.taskId,q.taskId);
  assert.equal((await db().task.findUniqueOrThrow({where:{id:q.taskId}})).visibility,'PRIVATE');
  const old=await db().taskVersion.findFirstOrThrow({where:{taskId:p.taskId},include:versionInclude});const hash=digest(JSON.stringify(old));assert.equal(publicVersion(old,'en').markSchemeText,undefined);assert.equal(publicVersion(old,'en',true).markSchemeStatus,'OCR_UNVERIFIED');
  const repeat=await checkBankTasks(admin,first);assert.equal(repeat.skipped,2);await applyBankTasks(admin,{...first,fingerprint:repeat.fingerprint});assert.equal(await db().taskVersion.count({where:{taskId:p.taskId}}),1);
  await db().feature.create({data:{key:'kept-feature',title:'Preserved feature'}});
  await db().task.update({where:{id:p.taskId},data:{visibility:'PRIVATE',featureKey:'kept-feature'}});await db().course.update({where:{id:pilotId('course','maths4u','0606')},data:{published:false}});
  rows[0].material.texts[0].title='Changed source';const second=await setup(),changed=await checkBankTasks(admin,second);assert.equal(changed.updated,1);await applyBankTasks(admin,{...second,fingerprint:changed.fingerprint});await applyBankStructure(admin,{runId:second.runId,key:'structure-0001'});
  const task=await db().task.findUniqueOrThrow({where:{id:p.taskId}});assert.equal(task.visibility,'PRIVATE');assert.equal(task.featureKey,'kept-feature');assert.equal((await db().course.findUniqueOrThrow({where:{id:pilotId('course','maths4u','0606')}})).published,false);
  assert.equal(await db().taskVersion.count({where:{taskId:p.taskId}}),2);assert.equal(digest(JSON.stringify(await db().taskVersion.findUniqueOrThrow({where:{id:old.id},include:versionInclude}))),hash);
  const v=await db().taskVersion.findFirstOrThrow({where:{taskId:p.taskId},orderBy:{number:'desc'},include:versionInclude});const edit={...editableVersion(v),visibility:task.visibility,featureKey:task.featureKey};edit.texts[0].markSchemeText='Teacher correction';edit.texts[0].markSchemeStatus='VERIFIED';await saveTask(admin,edit,p.taskId);
  const unchanged=await checkBankTasks(admin,second);assert.equal(unchanged.skipped,2);await applyBankTasks(admin,{...second,fingerprint:unchanged.fingerprint});assert.equal(await db().taskVersion.count({where:{taskId:p.taskId}}),3);
}
