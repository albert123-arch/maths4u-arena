// Private evidence only: persist row identities and hashes, never account data or connections.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
const runtime=JSON.parse(await fs.readFile('.local/content-bank/runtime.json','utf8')),u=new URL(runtime.MATHS4U_DATABASE_URL);
if(runtime.MATHS4U_ENV!=='test'||u.hostname!=='127.0.0.1'||!/^\/maths4u_test_bank_/.test(u.pathname))throw Error('ORIGINAL_LOCAL_ONLY');
const db=await mysql.createConnection(runtime.MATHS4U_DATABASE_URL);
const root='.local/original-quadratics';await fs.mkdir(root,{recursive:true});
const changed=['Course','CourseText','Topic','TopicText','Lesson','LessonVersion','LessonText','LessonTask','Task','TaskVersion','TaskText','TaskPart','PartText','TaskTopic','Source','ImportRecord'].map(t=>t.toLowerCase());
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
try{
  if(process.argv.includes('--before')){
    const out={tables:{},rows:{}};
    const [tables]=await db.query('SHOW TABLES');
    for(const t of tables){const table=Object.values(t)[0];if(!/^[A-Za-z0-9_]+$/.test(table))throw Error('TABLE_NAME');
      const [[count]]=await db.query(`SELECT COUNT(*) n FROM \`${table}\``),[[sum]]=await db.query(`CHECKSUM TABLE \`${table}\` EXTENDED`);out.tables[table]={rows:count.n,checksum:String(sum.Checksum)};
      if(changed.includes(table.toLowerCase())){
        const [keys]=await db.query(`SHOW KEYS FROM \`${table}\` WHERE Key_name='PRIMARY'`),columns=keys.sort((a,b)=>a.Seq_in_index-b.Seq_in_index).map(k=>k.Column_name);
        const [rows]=await db.query(`SELECT * FROM \`${table}\``);out.rows[table]={keys:columns,hashes:Object.fromEntries(rows.map(r=>[JSON.stringify(columns.map(k=>r[k])),hash(r)]))};
      }
    }
    await fs.writeFile(root+'/before.json',JSON.stringify(out));console.log('Arena baseline: hashes only; existing rows will be checked after import.');
  }else{
    const before=JSON.parse(await fs.readFile(root+'/before.json','utf8'));let preserved=0;
    const imported="SELECT taskId FROM ImportRecord WHERE sourceProject='maths4u' AND legacyId LIKE 'original:M4U-ORIG-QUAD-%'";
    const versions=`SELECT id FROM TaskVersion WHERE taskId IN (${imported})`;
    const lessons="SELECT id FROM Lesson WHERE topicId='orig_9709_p1_quadratics'";
    const lessonVersions=`SELECT id FROM LessonVersion WHERE lessonId IN (${lessons})`;
    const filters={course:"id<>'orig_9709_p1'",coursetext:"courseId<>'orig_9709_p1'",topic:"id<>'orig_9709_p1_quadratics'",topictext:"topicId<>'orig_9709_p1_quadratics'",
      lesson:`id NOT IN (${lessons})`,lessonversion:`lessonId NOT IN (${lessons})`,lessontext:`versionId NOT IN (${lessonVersions})`,lessontask:`lessonId NOT IN (${lessons})`,
      task:`id NOT IN (${imported})`,taskversion:`taskId NOT IN (${imported})`,tasktext:`versionId NOT IN (${versions})`,taskpart:`versionId NOT IN (${versions})`,
      parttext:`partId NOT IN (SELECT id FROM TaskPart WHERE versionId IN (${versions}))`,tasktopic:`taskId NOT IN (${imported})`,source:"name<>'Maths4U Original (AI-assisted)'",
      importrecord:"NOT (sourceProject='maths4u' AND legacyId LIKE 'original:M4U-ORIG-QUAD-%')"};
    for(const [table,old]of Object.entries(before.tables)){
      if(changed.includes(table.toLowerCase())){
        // MariaDB folds table names on Windows. Reconstruct the legacy subset in
        // a connection-scoped temporary table and compare its pre-import checksum.
        const temp='original_preserve_'+table.toLowerCase();
        await db.query(`CREATE TEMPORARY TABLE \`${temp}\` LIKE \`${table}\``);
        await db.query(`INSERT INTO \`${temp}\` SELECT * FROM \`${table}\` WHERE ${filters[table.toLowerCase()]}`);
        const [[sum]]=await db.query(`CHECKSUM TABLE \`${temp}\` EXTENDED`),[[count]]=await db.query(`SELECT COUNT(*) n FROM \`${temp}\``);
        if(String(sum.Checksum)!==old.checksum||count.n!==old.rows)throw Error('LEGACY_CONTENT_CHANGED:'+table);
        preserved+=count.n;
        await db.query(`DROP TEMPORARY TABLE \`${temp}\``);
      }else{
        const [[sum]]=await db.query(`CHECKSUM TABLE \`${table}\` EXTENDED`);if(String(sum.Checksum)!==old.checksum)throw Error('UNRELATED_TABLE_CHANGED:'+table);
      }
    }
    const [[tasks]]=await db.query("SELECT COUNT(*) n FROM TaskVersion WHERE sourceUid LIKE 'M4U-ORIG-QUAD-%'");
    if(tasks.n!==10)throw Error('ORIGINAL_TASK_COUNT');
    await fs.writeFile(root+'/preservation.json',JSON.stringify({preservedLegacyRows:preserved,unrelatedTablesUnchanged:true,newVersions:10},null,2));
    console.log('Arena: '+preserved+' legacy content rows preserved; unrelated tables unchanged; 10 new task versions.');
  }
}finally{await db.end();}
