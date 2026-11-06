import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {createHash} from 'node:crypto';
import {db} from '../src/lib/prisma';
import {userSelect} from '../src/lib/security';
import {applyReleaseD,planReleaseD,releaseDMaterials} from '../src/lib/release-d';
import {createTaskVersion} from '../src/lib/content';
import {approvedWhere} from '../src/lib/content-access';
const folder='.local/release-d-20261106';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
test('Release D: original rows preserved, dry-run and restart idempotent, importer quarantine transactional',{timeout:120000},async()=>{
 const u=new URL(process.env.MATHS4U_DATABASE_URL!);assert.equal(u.hostname,'127.0.0.1');assert.match(u.pathname,/^\/maths4u_test_bank_release_d_/);assert.equal(process.env.MATHS4U_ENV,'test');
 const conn=await mysql.createConnection(u.href);
 try{
  const baseline=JSON.parse(await fs.readFile(folder+'/baseline.json','utf8')) as Record<string,string[]>;
  const checked=[];
  for(const [table,old] of Object.entries(baseline)) {
   if(['Session','RateLimit'].includes(table))continue;
   assert.match(table,/^\w+$/);const [rows]=await conn.query<mysql.RowDataPacket[]>('SELECT * FROM `'+table+'`');
   const omitted=table==='Task'?['origin','originManual','originReason','originRule','examArchivedAt']:[];
   const now=new Set(rows.map(r=>hash(Object.fromEntries(Object.entries(r).filter(([k])=>!omitted.includes(k))))));
   assert(old.every(h=>now.has(h)),table+': an old row was rewritten or removed');
   checked.push({table,oldRows:old.length,currentRows:rows.length,originalRowsPreserved:true});
  }
  const snapshot=async()=>{const [tables]=await conn.query<mysql.RowDataPacket[]>('SHOW TABLES'),all:Record<string,string[]>={};for(const row of tables){const t=String(Object.values(row)[0]);assert.match(t,/^\w+$/);const [rows]=await conn.query<mysql.RowDataPacket[]>('SELECT * FROM `'+t+'`');all[t]=rows.map(hash).sort();}return all;};
  const before=await snapshot(),plan=await planReleaseD();assert.equal(plan.create,0);assert.equal(plan.existing,516);assert.equal(plan.taskRevisions.length,0);assert.equal(plan.lessonRevisions.length,0);
  const dry=await applyReleaseD(process.env.PRIVATE_STORAGE_PATH!,{apply:false});assert.equal(dry.state,'ALREADY_APPLIED');
  const repeat=await applyReleaseD(process.env.PRIVATE_STORAGE_PATH!,{apply:true});assert.equal(repeat.state,'ALREADY_APPLIED');
  assert.deepEqual(await snapshot(),before);
  const actor=await db().user.findFirstOrThrow({where:{roles:{some:{role:'ADMIN'}},status:'ACTIVE'},select:userSelect});
  await assert.rejects(db().$transaction(async tx=>{
   const input={...releaseDMaterials[0].material,sourceUid:'M4U-RELEASE-D-UNAPPROVED-QA'};
   const v=await createTaskVersion(tx,actor,input),t=await tx.task.findUniqueOrThrow({where:{id:v.taskId}});
   assert.equal(t.origin,'UNKNOWN');assert.equal(await tx.task.count({where:{id:t.id,examArchivedAt:null,...approvedWhere}}),0);
   const cam=await createTaskVersion(tx,actor,{...input,sourceUid:'M4U-RELEASE-D-CAM-QA',source:'Cambridge International',examBoard:'Cambridge'});
   const hidden=await tx.task.findUniqueOrThrow({where:{id:cam.taskId}});assert.equal(hidden.origin,'CAMBRIDGE_EXAM');assert(hidden.examArchivedAt);
   throw Error('CONTROLLED_RELEASE_TEST_ROLLBACK');
  }),/CONTROLLED_RELEASE_TEST_ROLLBACK/);
  assert.deepEqual(await snapshot(),before);
  const backup=await db().contentReleaseTaskBackup.count();assert.equal(backup,2826);
  await fs.mkdir('test-results/release-d-20261106',{recursive:true});
  await fs.writeFile('test-results/release-d-20261106/preservation.json',JSON.stringify({tables:checked,oldIdentitiesAndVersionsPreserved:true,answersAndReviewsPreserved:true,allTablesUnchangedByDryRunAndRepeat:true,transactionRollbackVerified:true,unknownImportDenied:true,cambridgeImportArchived:true,policyBackupRows:backup,plan},null,2));
 }finally{await conn.end();await db().$disconnect();}
});
