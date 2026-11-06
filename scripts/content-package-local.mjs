// Reuse one C1-C5 local runtime; never accept a production URL from the caller.
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const runtime=JSON.parse(await fs.readFile('.local/c1-20261106/runtime.json','utf8')),url=new URL(runtime.MATHS4U_DATABASE_URL);
if(runtime.MATHS4U_ENV!=='test'||url.hostname!=='127.0.0.1'||url.port!=='33317'||!/^\/maths4u_test_bank_c1_[a-f0-9]{12}$/.test(url.pathname))throw Error('CONTENT_PACKAGE_LOCAL_ONLY');
const args=process.argv.slice(2);if(!args.length)throw Error('COMMAND_REQUIRED');
const env={...process.env,...runtime};
for(const key of ['ARENA_RELEASE_D_APPLY','ARENA_RELEASE_D_BACKUP_ID','MATHS4U_BOOTSTRAP_ADMIN','NEW_ADMIN_PASSWORD'])delete env[key];
const child=spawn(process.execPath,args,{env,stdio:'inherit',windowsHide:true});
child.on('close',code=>process.exitCode=code??1);child.on('error',()=>process.exitCode=1);
