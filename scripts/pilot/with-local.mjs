import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const runtime = JSON.parse(await fs.readFile('.local/content-pilot/runtime.json', 'utf8'));
const url = new URL(runtime.MATHS4U_DATABASE_URL);
if (runtime.MATHS4U_ENV !== 'test' || url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/maths4u_test_pilot_')) throw new Error('LOCAL_PILOT_ONLY');
const child = spawn(process.execPath, process.argv.slice(2), { env: { ...process.env, ...runtime, APP_URL: 'http://127.0.0.1:3102' }, stdio: 'inherit', windowsHide: true });
child.on('error', () => { console.error('LOCAL_CHECK_FAILED'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
