import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import mysql from 'mysql2/promise';
const folder='.local/release-d-20261106/demo-failure';
test('Release D: mid-import failure stays gated, rolls back content, then retries with Demo hidden',{timeout:180000},async()=>{
 const r=JSON.parse(await fs.readFile(folder+'/runtime.json','utf8')),u=new URL(r.MATHS4U_DATABASE_URL);
 assert.equal(u.hostname,'127.0.0.1');assert.match(u.pathname,/^\/maths4u_test_bank_release_d_/);
 const conn=await mysql.createConnection(u.href),port=Number(r.PORT),base='http://127.0.0.1:'+port;
 const pack=JSON.parse(await fs.readFile('content/original/pure1-short-practice-v1.json','utf8'));
 let child;
 async function start(log){const fd=openSync(folder+'/'+log,'a');child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,...r,MATHS4U_ENV:'production'},stdio:['ignore',fd,fd],windowsHide:true});closeSync(fd);return child;}
 async function observe(expectReady){const statuses=[];for(let i=0;i<500;i++){try{const res=await fetch(base+'/api/catalog?pageSize=1',{signal:AbortSignal.timeout(1000)});const body=await res.json();statuses.push({status:res.status,total:body.total??null});if(res.status===200){assert(expectReady,'A failed release served application data');assert.equal(body.total,688);return statuses;}assert.equal(res.status,503);}catch(e){if(e.code==='ERR_ASSERTION')throw e;}if(child.exitCode!==null)return statuses;await new Promise(r=>setTimeout(r,100));}throw Error('STARTUP_TIMEOUT');}
 try{
  await conn.query('CREATE TRIGGER rd_import_failure BEFORE INSERT ON ImportRecord FOR EACH ROW BEGIN IF NEW.legacyId = ? THEN SIGNAL SQLSTATE \'45000\' SET MESSAGE_TEXT=\'Controlled rehearsal failure after written imports\'; END IF; END',['short-practice:'+pack.questions[0].uid]);
  await start('failed-start.log');const failed=await observe(false);assert(failed.length);assert.equal(child.exitCode,1);
  const [[task]]=await conn.query('SELECT COUNT(*) n FROM Task'),[[versions]]=await conn.query('SELECT COUNT(*) n FROM TaskVersion'),[[receipt]]=await conn.query('SELECT COUNT(*) n FROM ContentRelease'),[[visible]]=await conn.query("SELECT COUNT(*) n FROM Task WHERE origin='ORIGINAL' AND examArchivedAt IS NULL"),[[demo]]=await conn.query("SELECT COUNT(*) n FROM Task WHERE origin='DEMO' AND examArchivedAt IS NOT NULL");
  assert.equal(task.n,2836);assert.equal(versions.n,2836);assert.equal(receipt.n,0);assert.equal(visible.n,172);assert.equal(demo.n,10);
  await conn.query('DROP TRIGGER rd_import_failure');
  await start('successful-retry.log');const success=await observe(true);
  const [[count]]=await conn.query('SELECT COUNT(*) n FROM Task');assert.equal(count.n,3352);
  const [[release]]=await conn.query('SELECT details FROM ContentRelease');const details=typeof release.details==='string'?JSON.parse(release.details):release.details;assert.equal(details.created,516);assert.equal(details.demos,10);
  assert.equal((await fetch(base+'/courses/release-d-demo-fixture')).status,404);
  const ids=new Set();for(let p=1;p<=14;p++){const d=await(await fetch(base+'/api/catalog?pageSize=50&page='+p)).json();assert.equal(d.total,688);for(const i of d.items){assert(!['Cambridge','Cambridge International','Local preview demo'].includes(i.version.source));ids.add(i.id);}}assert.equal(ids.size,688);
  await fs.mkdir('test-results/release-d-20261106',{recursive:true});await fs.writeFile('test-results/release-d-20261106/failure-and-demo.json',JSON.stringify({midImportFailureRollback:true,failedStatuses:failed,oldAuthoredRetained:172,oldTasksRetained:2836,noApplicationServedDuringFailure:true,successfulRetry:success,visible:688,cambridgeArchived:2654,demosArchived:10,details},null,2));
 }finally{child?.kill();await conn.end();}
});
