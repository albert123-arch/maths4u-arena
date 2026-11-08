import fs from 'node:fs/promises';
import {db} from '../src/lib/prisma';
import {databaseConfig} from '../src/lib/database-url';
import {userSelect} from '../src/lib/security';
import {planContentPackage,applyContentPackage,changeContentPackage} from '../src/lib/content-packages';

// This is not a runtime/production importer. Reuse the guarded C1 local wrapper.
async function main(){
  const cfg=databaseConfig();
  if(process.env.MATHS4U_ENV!=='test'||cfg.host!=='127.0.0.1'||cfg.port!==33317||!/^maths4u_test_bank_c1_[a-f0-9]{12}$/.test(cfg.database))throw Error('LOCAL_ONLY');
  const actor=await db().user.findUniqueOrThrow({where:{username:'qa_c1_admin'},select:userSelect});
  const key='9709-s1-binomial-geometric',plan=await planContentPackage(actor,key);
  const receipt:{plan:unknown;apply?:unknown;publish?:unknown;repeat?:unknown}={plan};
  if(process.argv.includes('--apply')){
    receipt.apply=await applyContentPackage(actor,key,{token:plan.token});
    if(process.argv.includes('--publish'))receipt.publish=await changeContentPackage(actor,key,{action:'publish',fingerprint:plan.fingerprint});
    const repeated=await planContentPackage(actor,key);
    receipt.repeat=await applyContentPackage(actor,key,{token:repeated.token});
  }
  await fs.mkdir('.local/s1-binomial-geometric-20261108',{recursive:true});
  await fs.writeFile('.local/s1-binomial-geometric-20261108/'+(process.argv.includes('--apply')?'apply':'dry-run')+'.json',JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));
}
void main().catch(e=>{console.error(e.code??e.message??'LOCAL_PACKAGE_FAILED');process.exitCode=1;}).finally(()=>db().$disconnect());
