// Separate restoration entry point; all validation stays in content-policy.ts.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const child=spawn(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'scripts/content-policy.ts'),'--mode','restore',...process.argv.slice(2)],{cwd:root,env:process.env,stdio:'inherit',windowsHide:true});
child.on('error',()=>{process.exitCode=1;});child.on('close',code=>{process.exitCode=code??1;});
