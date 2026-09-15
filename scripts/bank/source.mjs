// Read-only source capture. Only generated files inside Arena/.local are written.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textContent } from 'domutils';
import { parse, all, hash } from '../pilot/prepare.mjs';

export const bankRoot = path.resolve('.local/content-bank');
export const legacyRoot = 'D:/www/AS&A level maths';
export const selectedCourses = [15, 6, 14, 13, 12];
export async function sourceData() {
  const reference = JSON.parse(await fs.readFile(path.join(legacyRoot, 'club-import-work/reference-data.json'), 'utf8'));
  const rows = JSON.parse(await fs.readFile(path.join(legacyRoot, 'club-import-work/existing-problems.json'), 'utf8'));
  const courses = selectedCourses.map(id => reference.courses.find(c => c.id === id));
  const chapters = reference.chapters.filter(c => selectedCourses.includes(c.course_id)).sort((a,b) => a.sort_order-b.sort_order || a.id-b.id);
  const subchapters = reference.subchapters.filter(s => chapters.some(c => c.id === s.chapter_id)).sort((a,b) => a.sort_order-b.sort_order || a.id-b.id);
  return { courses, chapters, subchapters, rows: rows.filter(r => subchapters.some(s => s.id === r.subchapter_id)) };
}
export async function page(name, relative) {
  const dir = path.join(bankRoot, 'source'); await fs.mkdir(dir, {recursive:true});
  const filename = path.join(dir, name + '.html');
  try { return await fs.readFile(filename, 'utf8'); } catch(e) { if(e.code !== 'ENOENT') throw e; }
  const url = new URL(relative, 'https://maths4u.sbs');
  if (url.origin !== 'https://maths4u.sbs' || !(url.pathname==='/' || /^\/(?:chapter|subchapter|problems|notes|practice)\.php$/.test(url.pathname))) throw new Error('BANK_SOURCE_URL');
  const response = await fetch(url, {redirect:'error', signal:AbortSignal.timeout(45000)});
  if (!response.ok) throw new Error(`BANK_SOURCE_HTTP_${response.status}_${name}`);
  const html = await response.text(); if(Buffer.byteLength(html)>8*1024*1024) throw new Error('BANK_SOURCE_SIZE');
  await fs.writeFile(filename, html); return html;
}
export async function capture() {
  const d=await sourceData();
  await page('index','/');
  const jobs = [...d.chapters.map(c=>['chapter-'+c.id, '/chapter.php?id='+c.id]), ...d.subchapters.flatMap(s=>[['topic-'+s.id, '/subchapter.php?id='+s.id], ['problems-'+s.id, '/problems.php?subchapter_id='+s.id+'&filter=all'], ...['en','ru'].map(lang=>['notes-'+s.id+'-'+lang,'/notes.php?subchapter_id='+s.id+'&lang='+lang])])];
  let done=0;
  async function worker() { for(;;) { const job=jobs.shift(); if(!job) break; const html=await page(...job);
    void html;
    done++;if(done%30===0) console.log('Source pages captured: '+done);
  }}
  await Promise.all([worker(),worker()]);
  const reports=[];
  for(const c of d.courses) {
    const chapters=d.chapters.filter(ch=>ch.course_id===c.id), topics=d.subchapters.filter(s=>chapters.some(ch=>ch.id===s.chapter_id));
    const rows=d.rows.filter(r=>topics.some(s=>s.id===r.subchapter_id));
    const links=[],files=new Set(),ms=new Set(),liveSolutions=new Set(), discrepancies=[];
    for(const s of topics) {
      const html=await page('problems-'+s.id,'/problems.php?subchapter_id='+s.id+'&filter=all'),doc=parse(html);
      const cards=all(doc,n=>n.attribs?.['data-problem-card-id']);
      for(const card of cards) {const id=Number(card.attribs['data-problem-card-id']);links.push({subchapterId:s.id,table:'problems',id});
        for(const n of all(card,n=>n.name==='img')) files.add(new URL(n.attribs.src,'https://maths4u.sbs/').href);
        if(all(card,n=>n.attribs?.id==='mk-'+id).some(n=>all(n,x=>x.name==='img'||x.name==='a').length||textContent(n).trim())) ms.add(id);
        if(all(card,n=>n.attribs?.id==='sol-'+id).length) liveSolutions.add(id);
      }
      const expected=rows.filter(r=>r.subchapter_id===s.id && r.is_published).map(r=>r.id).sort((a,b)=>a-b),actual=cards.map(n=>Number(n.attribs['data-problem-card-id'])).sort((a,b)=>a-b);
      if(JSON.stringify(expected)!==JSON.stringify(actual)) discrepancies.push({subchapterId:s.id,expected,actual});
    }
    reports.push({course:c.name,sourceCourseId:c.id,chapters:chapters.length,subtopics:topics.length,uniqueTasks:rows.length,taskLinks:links.length,files:files.size,solutions:rows.filter(r=>r.solution_html?.trim()).length,liveSolutions:liveSolutions.size,markSchemes:ms.size,discrepancies});
  }
  const sources=[];for(const name of await fs.readdir(path.join(bankRoot,'source'))) {const bytes=await fs.readFile(path.join(bankRoot,'source',name));sources.push({name,sha256:hash(bytes)});}
  await fs.writeFile(path.join(bankRoot,'inventory.json'),JSON.stringify({capturedAt:new Date().toISOString(),courses:reports,sources},null,2));
  console.log(JSON.stringify(reports));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) capture().catch(e=>{console.error(/^BANK_[A-Z0-9_-]+$/.test(e.message)?e.message:'BANK_CAPTURE_FAILED');process.exitCode=1;});
