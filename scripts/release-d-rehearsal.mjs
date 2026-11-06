// Reconstruct the documented production content footprint from the preserved H1
// fixture. No production connection, no exported student identities, no reset.
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import {randomBytes,createHash} from 'node:crypto';
process.on('uncaughtException',e=>{console.error(e.code??( /^[A-Z_0-9]+$/.test(e.message)?e.message:'REHEARSAL_FAILED'));process.exitCode=1;});
const withDemo=process.argv.includes('--with-demo');
const folder='.local/release-d-20261106'+(withDemo?'/demo-failure':'');
await fs.mkdir(folder,{recursive:true});
let previous;
try { previous=JSON.parse(await fs.readFile(folder+'/runtime.json','utf8')); }
catch(e) { if(e.code!=='ENOENT')throw e; }
const source=JSON.parse(await fs.readFile('.local/h1-20261106/runtime.json','utf8'));
const url=new URL(source.MATHS4U_DATABASE_URL);
if(source.MATHS4U_ENV!=='test'||url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/maths4u_test_bank_h1_'))throw Error('LOCAL_H1_SOURCE_ONLY');
const secrets=JSON.parse((await fs.readFile('.local/db-secrets.json','utf8')).replace(/^\uFEFF/,''));
const root=await mysql.createConnection({host:'127.0.0.1',port:Number(url.port),user:'root',password:secrets.rootPassword});
const from=await mysql.createConnection(url.href);let to;
try {
 let runtime=previous;
 if(!runtime){
 const suffix=randomBytes(6).toString('hex'),name='maths4u_test_bank_release_d_'+suffix,user='rd_'+suffix,password=randomBytes(28).toString('hex');
 await root.query('CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await root.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[user,password]);
 await root.query('GRANT ALL ON `'+name+'`.* TO ?@\'127.0.0.1\'',[user]);
 runtime={...source,MATHS4U_DATABASE_NAME:name,MATHS4U_DATABASE_URL:`mysql://${user}:${password}@127.0.0.1:${url.port}/${name}`,APP_URL:'https://arena.maths4u.sbs',PORT:withDemo?'3107':'3105',HOSTNAME:'127.0.0.1',MATHS4U_RUN_MIGRATIONS:'1',ARENA_RELEASE_D_APPLY:'1',ARENA_RELEASE_D_BACKUP_ID:'reconstructed-H1-baseline-20261106'};
 }
 const target=new URL(runtime.MATHS4U_DATABASE_URL);
 if(target.hostname!=='127.0.0.1'||!target.pathname.startsWith('/maths4u_test_bank_release_d_'))throw Error('LOCAL_TARGET_ONLY');
 await fs.writeFile(folder+'/runtime.json',JSON.stringify(runtime));
 to=await mysql.createConnection(runtime.MATHS4U_DATABASE_URL);
 const [existing]=await to.query('SHOW TABLES');
 if(existing.some(r=>Object.values(r)[0].toLowerCase()==='contentrelease'))throw Error('REHEARSAL_ALREADY_MIGRATED');
 const [tables]=await from.query('SHOW TABLES'),data=new Map(),ddl=new Map();
 const modelNames=[...(await fs.readFile('prisma/schema.prisma','utf8')).matchAll(/^model (\w+)\s*\{/gm)].map(m=>m[1]);
 const canonical=n=>modelNames.find(m=>m.toLowerCase()===n.toLowerCase())??n;
 for(const row of tables){const raw=String(Object.values(row)[0]),name=canonical(raw);if(!/^\w+$/.test(name))throw Error('INVALID_TABLE');const [[schema]]=await from.query('SHOW CREATE TABLE `'+name+'`');ddl.set(name,schema['Create Table']);const [rows]=await from.query('SELECT * FROM `'+name+'`');data.set(name,rows);}
 const versions=data.get('TaskVersion'),sources=new Map(data.get('Source').map(s=>[s.id,s.name]));
 const ids=new Set(versions.filter(v=>['Cambridge','Cambridge International','Maths4U Original · Quadratics 2026','Olymp / Book 2. Olympiad Number Theory Methods'].includes(sources.get(v.sourceId))).map(v=>v.taskId));
 if(ids.size!==2826)throw Error('EXPECTED_2826_H1_TASKS');
 data.set('Task',data.get('Task').filter(t=>ids.has(t.id)));
 data.set('Topic',data.get('Topic').filter(t=>!t.id.startsWith('orig_')||t.id==='orig_9709_p1_quadratics'));
 const [foreign]=await from.query('SELECT TABLE_NAME t,COLUMN_NAME c,REFERENCED_TABLE_NAME p,REFERENCED_COLUMN_NAME pc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL',[url.pathname.slice(1)]);
 for(const f of foreign){f.t=canonical(f.t);f.p=canonical(f.p);}
 // Remove only rows from the new *in-memory* fixture whose parents were omitted.
 let changed=true;while(changed){changed=false;for(const f of foreign){const parents=new Set(data.get(f.p).map(r=>String(r[f.pc]))),rows=data.get(f.t),filtered=rows.filter(r=>r[f.c]===null||parents.has(String(r[f.c])));if(filtered.length!==rows.length){data.set(f.t,filtered);changed=true;}}}
 if(withDemo){
  const copy=(table,overrides,template=data.get(table)[0])=>{const r={...template,...overrides};data.get(table).push(r);return r;};
  copy('Source',{id:'rd_demo_source',name:'Local preview demo',url:null});
  copy('Course',{id:'rd_demo_course',slug:'release-d-demo-fixture',published:1,featureKey:null,archivedAt:null});
  copy('CourseText',{courseId:'rd_demo_course',locale:'en',title:'Practice preview: MC & Short Answer',description:'Synthetic rehearsal only'});
  copy('Topic',{id:'rd_demo_topic',courseId:'rd_demo_course',slug:'demo'});copy('TopicText',{topicId:'rd_demo_topic',locale:'en',title:'Demo'});
  copy('Lesson',{id:'rd_demo_lesson',topicId:'rd_demo_topic',archivedAt:null});copy('LessonVersion',{id:'rd_demo_lv',lessonId:'rd_demo_lesson',number:1});
  copy('LessonText',{versionId:'rd_demo_lv',locale:'en',title:'Demo',body:'',examples:''});
  for(let i=1;i<=10;i++){
   const id='rd_demo_'+i;copy('Task',{id,visibility:'PUBLIC',featureKey:null,archivedAt:null});
   copy('TaskVersion',{id:id+'_v',taskId:id,number:1,sourceId:'rd_demo_source',sourceUid:'learning-preview-'+i,sourceReference:'Synthetic demo',examBoard:null,year:null,paper:null,questionNumber:null});
   copy('TaskText',{versionId:id+'_v',locale:'en',title:'Demo '+i,statement:'<p>Find 1 + 1.</p>',solution:'<p>2</p>'});
   copy('TaskPart',{id:id+'_p',versionId:id+'_v',kind:'NUMERIC',position:0,maxPoints:1,numericAnswer:2,tolerance:0});
   copy('PartText',{partId:id+'_p',locale:'en',prompt:'',answer:'2',rubric:'One point'});
   copy('LessonTask',{lessonId:'rd_demo_lesson',taskId:id,position:i});
  }
 }
 await to.query('SET FOREIGN_KEY_CHECKS=0');
 for(const schema of ddl.values())await to.query(schema.replace(/^CREATE TABLE /,'CREATE TABLE IF NOT EXISTS '));
 const scalar=v=>v!==null&&typeof v==='object'&&!Buffer.isBuffer(v)&&!(v instanceof Date)?JSON.stringify(v):v;
 for(const [name,rows] of data){if(!rows.length)continue;const cols=Object.keys(rows[0]);for(let i=0;i<rows.length;i+=150)await to.query('INSERT IGNORE INTO `'+name+'` ('+cols.map(c=>'`'+c+'`').join(',')+') VALUES ?',[rows.slice(i,i+150).map(r=>cols.map(c=>scalar(r[c])))]);}
 await to.query('SET FOREIGN_KEY_CHECKS=1');
 const fixture=JSON.parse(await fs.readFile('.local/h1-20261106/fixture.json','utf8'));
 // Frozen synthetic response/review demonstrates historical preservation. No real pupil data.
 const [[part]]=await to.query('SELECT p.id FROM TaskPart p JOIN TaskVersion v ON v.id=p.versionId WHERE v.taskId=? ORDER BY v.number DESC,p.position LIMIT 1',[fixture.cam]);
 await to.query('UPDATE Attempt SET status=\'GRADED\',submittedAt=NOW(3),gradedAt=NOW(3) WHERE id=?',[fixture.attempt]);
 await to.query('INSERT INTO Answer (id,attemptId,partId,response) VALUES (?,?,?,?)',['release_d_answer',fixture.attempt,part.id,JSON.stringify({value:'Synthetic preserved pre-release working'})]);
 await to.query('INSERT INTO Review (id,answerId,reviewerId,points,comment) VALUES (?,?,?,?,?)',['release_d_review','release_d_answer',fixture.teacher,1,'Synthetic pre-release feedback']);
 await fs.writeFile(folder+'/fixture.json',JSON.stringify({...fixture,answer:'release_d_answer',review:'release_d_review'}));
 const before={};for(const [name] of ddl){const [rows]=await to.query('SELECT * FROM `'+name+'`');before[name]=rows.map(r=>createHash('sha256').update(JSON.stringify(r)).digest('hex')).sort();}
 await fs.writeFile(folder+'/baseline.json',JSON.stringify(before));
 console.log(JSON.stringify({local:true,tasks:ids.size+(withDemo?10:0),demos:withDemo?10:0,migrations:data.get('_prisma_migrations').length,source:'preserved H1 fixture plus source package; reconstructed, not a production DB export',copiedAssetBytes:0,port:runtime.PORT}));
}finally{await Promise.all([from.end(),root.end(),to?.end()]);}
