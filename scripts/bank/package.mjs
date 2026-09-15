import {spawnSync} from 'node:child_process';
for(const [exe,args]of [[process.execPath,['scripts/bank/audit-source.mjs']],[process.execPath,['--import','tsx','scripts/bank/verify.ts']],[process.env.MATHS4U_PYTHON||'python',['scripts/bank/package.py']]]){
  const r=spawnSync(exe,args,{stdio:'inherit',windowsHide:true});if(r.status!==0)process.exit(r.status||1);
}
