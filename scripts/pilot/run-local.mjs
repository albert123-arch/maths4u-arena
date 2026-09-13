import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import mysql from 'mysql2/promise';

// Reads the existing Arena-only local database bootstrap. Never reads legacy configs.
const root = process.cwd(), pilot = path.join(root, '.local/content-pilot');
let connection;
try {
  const secret = JSON.parse((await fs.readFile(path.join(root, '.local/db-secrets.json'), 'utf8')).replace(/^\uFEFF/, ''));
  connection = await mysql.createConnection({ host: '127.0.0.1', port: 33317, user: 'root', password: secret.rootPassword });
  const suffix = randomBytes(7).toString('hex'), database = 'maths4u_test_pilot_' + suffix, username = 'pilot_' + suffix, password = randomBytes(32).toString('hex');
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?", [username, password]);
  await connection.query(`GRANT ALL ON \`${database}\`.* TO ?@'127.0.0.1'`, [username]);
  await connection.end(); connection = undefined;
  const env = { ...process.env, MATHS4U_ENV: 'test', MATHS4U_DATABASE_URL: `mysql://${username}:${password}@127.0.0.1:33317/${database}`,
    MATHS4U_DATABASE_NAME: database, PRIVATE_STORAGE_PATH: path.join(pilot, 'storage', suffix), APP_URL: 'http://127.0.0.1:3101' };
  const run = (args, inherit = true) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, windowsHide: true, stdio: inherit ? 'inherit' : 'ignore' });
    child.on('error', () => reject(new Error('PILOT_PROCESS_FAILED'))); child.on('close', code => code === 0 ? resolve() : reject(new Error('PILOT_CHECK_FAILED')));
  });
  console.log('Applying existing migrations to a new isolated Arena test database.');
  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy'], false);
  console.log('Migrations passed; running real-content checks on Node ' + process.versions.node + '.');
  await fs.mkdir(pilot, { recursive: true });
  await fs.writeFile(path.join(pilot, 'runtime.json'), JSON.stringify(Object.fromEntries(['MATHS4U_ENV', 'MATHS4U_DATABASE_URL', 'MATHS4U_DATABASE_NAME', 'PRIVATE_STORAGE_PATH', 'APP_URL'].map(k => [k, env[k]]))));
  if (process.argv.includes('--ux')) {
    for (const test of ['review-ux', 'catalog-ux', 'study-ux']) await run(['--import', 'tsx', '--test', `tests/${test}.test.ts`]);
  } else await run(['--import', 'tsx', '--test', process.argv.includes('--review') ? 'tests/review-ux.test.ts' : process.argv.includes('--publication') ? 'tests/pilot-publication.test.ts' : 'tests/pilot-import.test.ts']);
} catch (error) {
  console.error(/^PILOT_[A-Z_]+$/.test(error.message) ? error.message : 'PILOT_LOCAL_SETUP_FAILED'); process.exitCode = 1;
} finally { if (connection) await connection.end().catch(() => undefined); }
