import {readFile,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bankManifestSchema,bankAssetsSchema,bankTasksSchema,bankStructureSchema,type BankAsset,type BankTask} from '../../src/lib/bank-schema';
import {digest} from '../../src/lib/security';
import {renderContent} from '../../src/lib/content';
import {verifyBankSvg} from '../../src/lib/bank-svg.mjs';
import {parseDocument} from 'htmlparser2';
import {findAll} from 'domutils';

export async function verifyBankPackage(){
  const root=await realpath('.local/content-bank/publish'),manifest=bankManifestSchema.parse(JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')));
  const files=new Map<string,BankAsset>(),tasks:BankTask[]=[],structures:ReturnType<typeof bankStructureSchema.parse>=[],entries=new Set(['manifest.json']);
  for(const b of manifest.batches){const name='batches/'+b.key+'.json',bytes=await readFile(path.join(root,name));assert.equal(digest(bytes),b.sha256);assert.ok(bytes.length<=512*1024);const data=JSON.parse(bytes.toString());assert.equal(data.length,b.count);entries.add(name);
    if(b.kind==='assets')for(const a of bankAssetsSchema.parse(data)){assert.ok(!files.has(a.id));files.set(a.id,a);entries.add(a.file);}
    else if(b.kind==='tasks')tasks.push(...bankTasksSchema.parse(data));else structures.push(...bankStructureSchema.parse(data));
  }
  assert.equal(tasks.length,manifest.tasks);assert.equal(new Set(tasks.map(r=>r.table+':'+r.id)).size,tasks.length);assert.equal(files.size,manifest.files);assert.equal([...files.values()].reduce((n,a)=>n+a.size,0),manifest.bytes);
  const used=new Set<string>(),positions=new Set<string>();let rendered=0;
  for(const row of tasks){for(const link of row.links){assert.ok(structures.some(c=>c.key===link.courseKey&&c.chapters.some(ch=>ch.key===link.chapterKey&&ch.lessons.some(l=>l.key===link.lessonKey))));const key=link.lessonKey+':'+link.position;assert.ok(!positions.has(key));positions.add(key);}
    for(const a of row.material.assets){const f=files.get(a.fileId);assert.ok(f&&f.role===a.role);used.add(a.fileId);}
    for(const text of [...row.material.texts,...row.material.parts.flatMap(p=>p.texts)])for(const [field,value]of Object.entries(text))if(typeof value==='string'&&['statement','answer','prompt','rubric','hint','solution','markScheme','markSchemeText'].includes(field)){
      const html=renderContent(value);assert.ok(!html.includes('katex-error'),row.id+':'+field);rendered++;
      for(const img of findAll(n=>n.name==='img',parseDocument(html).children)){const id=img.attribs.src.replace('/api/files/','');assert.ok(files.has(id)&&row.material.assets.some(a=>a.fileId===id));}
    }
  }assert.equal(used.size,files.size);
  for(const a of files.values()){assert.equal(a.file,'assets/'+a.sha256+(a.mimeType==='image/png'?'.png':'.svg'));const filename=await realpath(path.join(root,a.file));assert.ok(filename.startsWith(root+path.sep));const bytes=await readFile(filename);assert.equal(bytes.length,a.size);assert.equal(digest(bytes),a.sha256);if(a.mimeType==='image/svg+xml')verifyBankSvg(bytes);else assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
  for(const c of manifest.courses){const actual=structures.filter(s=>s.key===c.key);assert.equal(actual.length,c.chapterCount);assert.equal(new Set(actual.flatMap(s=>s.chapters.map(ch=>ch.key))).size,c.chapterCount);}
  const report=JSON.parse(await readFile('.local/content-bank/report.json','utf8'));
  for(const c of report.courses){const meta=manifest.courses.find(m=>m.title===c.course)!;const selected=tasks.filter(t=>t.links.some(l=>l.courseKey===meta.key));assert.equal(selected.length,c.tasks);c.files=new Set(selected.flatMap(t=>t.material.assets.map(a=>a.fileId))).size;c.scannedMarkSchemes=selected.filter(t=>t.material.texts.some(x=>!!x.markScheme)).length;c.sourceText=selected.filter(t=>t.material.texts.some(x=>x.markSchemeStatus==='SOURCE_TEXT')).length;c.unverifiedOcr=selected.filter(t=>t.material.texts.some(x=>x.markSchemeStatus==='OCR_UNVERIFIED')).length;}
  await writeFile('.local/content-bank/report.json',JSON.stringify(report,null,2));
  const summary={tasks:tasks.length,links:tasks.reduce((n,t)=>n+t.links.length,0),chapters:structures.length,subtopics:structures.flatMap(c=>c.chapters.flatMap(ch=>ch.lessons)).length,files:files.size,uniqueAssetBytes:new Set([...files.values()].map(a=>a.sha256)).size,fieldsRendered:rendered,manifestSha256:digest(await readFile(path.join(root,'manifest.json')))};
  await writeFile('.local/content-bank/package-verified.json',JSON.stringify({...summary,entries:[...entries].sort()},null,2));console.log(JSON.stringify(summary));return summary;
}
verifyBankPackage().catch(e=>{console.error(e instanceof assert.AssertionError?'BANK_PACKAGE_INVARIANT_FAILED':'BANK_PACKAGE_VERIFICATION_FAILED');process.exitCode=1;});
