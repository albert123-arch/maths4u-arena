import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const runtime=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8')),url=new URL(runtime.MATHS4U_DATABASE_URL);
if(runtime.MATHS4U_ENV!=='test'||url.hostname!=='127.0.0.1'||!/^\/maths4u_test_bank_/.test(url.pathname))throw new Error('BANK_LOCAL_ONLY');
const args=process.argv.slice(2);if(!args.length)throw new Error('BANK_COMMAND_REQUIRED');
const child=spawn(process.execPath,args,{env:{...process.env,...runtime},stdio:'inherit',windowsHide:true});child.once('error',()=>{process.exitCode=1;});child.once('close',code=>{process.exitCode=code||0;});
