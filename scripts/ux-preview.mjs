import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const runtime = JSON.parse(await fs.readFile('.local/content-pilot/runtime.json', 'utf8'));
const url = new URL(runtime.MATHS4U_DATABASE_URL);
if (runtime.MATHS4U_ENV !== 'test' || url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/maths4u_test_pilot_')) throw new Error('LOCAL_PREVIEW_ONLY');
const env = { ...process.env, ...runtime, APP_URL: 'http://127.0.0.1:3102' };
for (const args of [['scripts/prepare-pdf-viewer.mjs'], ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3102']]) {
  const status = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
    child.on('close', resolve); child.on('error', () => resolve(1));
  });
  if (status !== 0) process.exit(status || 1);
}
