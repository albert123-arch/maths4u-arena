import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import mysql from 'mysql2/promise';

// Every run gets a NEW Arena-only database. No DROP, RESET or source DB access.
const root=path.resolve('.local/content-bank');let connection;
try {
  const secret=JSON.parse((await fs.readFile('.local/db-secrets.json','utf8')).replace(/^\uFEFF/,''));
  connection=await mysql.createConnection({host:'127.0.0.1',port:33317,user:'root',password:secret.rootPassword});
  const suffix=randomBytes(7).toString('hex'),database='maths4u_test_bank_'+suffix,username='bank_'+suffix,password=randomBytes(32).toString('hex');
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?",[username,password]);
  await connection.query(`GRANT ALL ON \`${database}\`.* TO ?@'127.0.0.1'`,[username]);await connection.end();connection=null;
  const runtime={MATHS4U_ENV:'test',MATHS4U_DATABASE_URL:`mysql://${username}:${password}@127.0.0.1:33317/${database}`,MATHS4U_DATABASE_NAME:database,PRIVATE_STORAGE_PATH:path.join(root,'storage',suffix),APP_URL:'http://127.0.0.1:3103'};
  await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'runtime.json'),JSON.stringify(runtime));
  const run=args=>new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{env:{...process.env,...runtime},stdio:'inherit',windowsHide:true});c.once('error',()=>reject(new Error('BANK_PROCESS_FAILED')));c.once('close',code=>code===0?resolve():reject(new Error('BANK_LOCAL_CHECK_FAILED')));});
  await run(['node_modules/prisma/build/index.js','migrate','deploy']);
  await run(['--import','tsx','--test','tests/bank-import.test.ts']);
  await run(['--import','tsx','scripts/bank/browser-fixture.ts']);
}catch(e){console.error(/^BANK_[A-Z_]+$/.test(e.message)?e.message:'BANK_LOCAL_SETUP_FAILED');process.exitCode=1;}finally{if(connection)await connection.end().catch(()=>{});}
