// Local proof: retain primary keys and row hashes only, never connection/account values.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
const runtime=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8')),u=new URL(runtime.MATHS4U_DATABASE_URL);
if(runtime.MATHS4U_ENV!=='test'||u.hostname!=='127.0.0.1'||!/^\/maths4u_test_bank_/.test(u.pathname))throw Error('ORIGINAL_LOCAL_ONLY');
const db=await mysql.createConnection(runtime.MATHS4U_DATABASE_URL),root='.local/original-functions';await fs.mkdir(root,{recursive:true});
const changed=['topic','topictext','lesson','lessonversion','lessontext','lessontask','task','taskversion','tasktext','taskpart','parttext','tasktopic','importrecord'];
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
try{
 if(process.argv.includes('--before')){
  try{await fs.access(root+'/before.json');throw Error('BASELINE_ALREADY_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}
  const out={tables:{},rows:{}};const [tables]=await db.query('SHOW TABLES');
  for(const t of tables){const table=Object.values(t)[0];if(!/^[A-Za-z0-9_]+$/.test(table))throw Error('TABLE_NAME');
   const [[count]]=await db.query(`SELECT COUNT(*) n FROM \`${table}\``),[[sum]]=await db.query(`CHECKSUM TABLE \`${table}\` EXTENDED`);out.tables[table]={rows:count.n,checksum:String(sum.Checksum)};
   if(changed.includes(table.toLowerCase())){
    const [keys]=await db.query(`SHOW KEYS FROM \`${table}\` WHERE Key_name='PRIMARY'`),columns=keys.sort((a,b)=>a.Seq_in_index-b.Seq_in_index).map(k=>k.Column_name);
    const [rows]=await db.query(`SELECT * FROM \`${table}\``);out.rows[table]={keys:columns,hashes:Object.fromEntries(rows.map(r=>[JSON.stringify(columns.map(k=>r[k])),hash(r)]))};
   }
  }
  await fs.writeFile(root+'/before.json',JSON.stringify(out));console.log('Functions baseline saved: existing content row hashes and unrelated table checksums.');
 }else{
  const before=JSON.parse(await fs.readFile(root+'/before.json','utf8'));let preserved=0;
  for(const [table,old]of Object.entries(before.tables)){
   if(!/^[A-Za-z0-9_]+$/.test(table))throw Error('TABLE_NAME');
   if(changed.includes(table.toLowerCase())){
    const b=before.rows[table],[rows]=await db.query(`SELECT * FROM \`${table}\``),now=new Map(rows.map(r=>[JSON.stringify(b.keys.map(k=>r[k])),hash(r)]));
    for(const [id,sum]of Object.entries(b.hashes)){if(now.get(id)!==sum)throw Error('OLD_ROW_CHANGED:'+table);preserved++;}
   }else{const [[sum]]=await db.query(`CHECKSUM TABLE \`${table}\` EXTENDED`);if(String(sum.Checksum)!==old.checksum)throw Error('UNRELATED_TABLE_CHANGED:'+table);}
  }
  const [[count]]=await db.query("SELECT COUNT(*) n FROM TaskVersion WHERE sourceUid LIKE 'M4U-ORIG-FUNC-%'");if(count.n!==10)throw Error('FUNCTIONS_COUNT');
  await fs.writeFile(root+'/preservation.json',JSON.stringify({preservedExistingContentRows:preserved,quadraticsIncluded:true,unrelatedTablesUnchanged:true,newFunctionsVersions:10},null,2));
  console.log('PASS: '+preserved+' existing content rows unchanged, including Quadratics; all unrelated table checksums match.');
 }
}finally{await db.end();}
