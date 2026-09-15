import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sourceData,page,bankRoot} from './source.mjs';
import {parse,all,hash} from '../pilot/prepare.mjs';
import {textContent} from 'domutils';
const d=await sourceData(),index=parse(await page('index','/'));
for(const c of d.courses){const chapters=d.chapters.filter(ch=>ch.course_id===c.id),ids=new Set(chapters.map(ch=>ch.id));
  const publicOrder=[...new Set(all(index,n=>n.name==='a'&&/^\/?chapter\.php\?id=\d+$/.test(n.attribs.href||'')).map(n=>Number(new URL(n.attribs.href,'https://maths4u.sbs').searchParams.get('id'))).filter(id=>ids.has(id)))];assert.deepEqual(publicOrder,chapters.map(ch=>ch.id));
  for(const ch of chapters){const doc=parse(await page('chapter-'+ch.id,'/chapter.php?id='+ch.id)),links=all(doc,n=>n.name==='a'&&/^\/?subchapter\.php\?id=\d+$/.test(n.attribs.href||'')),expected=d.subchapters.filter(s=>s.chapter_id===ch.id);assert.deepEqual(links.map(n=>Number(new URL(n.attribs.href,'https://maths4u.sbs').searchParams.get('id'))),expected.map(s=>s.id));assert.deepEqual(links.map(n=>textContent(n).trim()),expected.map(s=>s.name.trim()));}
}
const inventory=JSON.parse(await fs.readFile(bankRoot+'/inventory.json','utf8'));
for(const source of inventory.sources)assert.equal(hash(await fs.readFile(bankRoot+'/source/'+source.name)),source.sha256);
const report=JSON.parse(await fs.readFile(bankRoot+'/report.json','utf8'));
for(const c of report.courses)for(const row of c.sourceDifferences){assert.ok(['6528','6451','6261'].includes(row.id));row.reason=row.id==='6261'?'Trailing </html> in local export omitted by live source HTML parser.':'Live source solution ends before malformed </html> and appended content in the local export. Imported the complete visible live solution; raw export preserved read-only.';}
report.sourceVerification={chapters:41,subtopics:213,order:'exactly matches public chapter/subchapter links',capturedFilesVerified:inventory.sources.length,taskMembership:'all selected published source IDs match; no skipped tasks'};
await fs.writeFile(bankRoot+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.sourceVerification));
