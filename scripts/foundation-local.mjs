// Reuse the existing isolated bank; never load production credentials for UX QA.
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const runtime=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8'));
const url=new URL(runtime.MATHS4U_DATABASE_URL);
if(runtime.MATHS4U_ENV!=='test'||url.hostname!=='127.0.0.1'||!url.pathname.startsWith('/maths4u_test_bank_'))throw Error('LOCAL_BANK_REQUIRED');
const args=process.argv.includes('--production')?['.next/standalone/server.js']:['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3102'];
const child=spawn(process.execPath,args,{env:{...process.env,...runtime,APP_URL:'http://127.0.0.1:3102',PORT:'3102',HOSTNAME:'127.0.0.1'},stdio:'inherit',windowsHide:true});
child.on('close',code=>{process.exitCode=code??1;});
