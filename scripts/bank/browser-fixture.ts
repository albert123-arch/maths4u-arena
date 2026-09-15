import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../../src/lib/prisma';
import {databaseConfig} from '../../src/lib/database-url';
import {pilotId} from '../../src/lib/pilot-schema';
import {bankManifestSchema,bankTasksSchema,type BankTask} from '../../src/lib/bank-schema';
async function main(){
  const cfg=databaseConfig();if(process.env.MATHS4U_ENV!=='test'||cfg.host!=='127.0.0.1'||!cfg.database.startsWith('maths4u_test_bank_'))throw new Error('BANK_LOCAL_ONLY');
  const root='.local/content-bank/publish',manifest=bankManifestSchema.parse(JSON.parse(await readFile(root+'/manifest.json','utf8'))),rows:BankTask[]=[];
  for(const b of manifest.batches.filter(b=>b.kind==='tasks'))rows.push(...bankTasksSchema.parse(JSON.parse(await readFile(root+'/batches/'+b.key+'.json','utf8'))));
  const selected=[];for(const id of ['8495','5808','6451','6152','6124','5889','6666']){const row=rows.find(r=>r.id===id)!;if(!row)throw new Error('BANK_REPRESENTATIVE_MISSING');const record=await db().importRecord.findUniqueOrThrow({where:{sourceProject_legacyId:{sourceProject:'maths4u',legacyId:'problems:'+id}}});selected.push({slug:'maths4u-'+row.links[0].courseKey,title:row.material.texts[0].title,sourceId:id,taskId:record.taskId,lessonId:pilotId('lesson','maths4u',row.links[0].lessonKey),assetCount:row.material.assets.length});}
  await writeFile('.local/content-bank/browser-fixture.json',JSON.stringify(selected,null,2));console.log('Seven real browser representatives prepared, including structured parts and two MS files.');
}
main().catch(()=>{console.error('BANK_BROWSER_FIXTURE_FAILED');process.exitCode=1;}).finally(()=>db().$disconnect());
