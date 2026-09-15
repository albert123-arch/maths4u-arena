import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { textContent } from 'domutils';
import sanitizeHtml from 'sanitize-html';
import { bankRoot, legacyRoot, sourceData, page } from './source.mjs';
import { parse, all, inner, hasClass, hash, formulaAudit } from '../pilot/prepare.mjs';
import { normalizeSourceMath, protectMathHtml } from '../../src/lib/math-markup.mjs';
import { verifyBankSvg } from '../../src/lib/bank-svg.mjs';
import {canonicalJson} from '../../src/lib/canonical-json.mjs';

const esc = s => String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const outer = (n,html) => html.slice(n.startIndex,n.endIndex+1);
const images = n => all(n,x=>x.name==='img');
const byId = (n,id) => all(n,x=>x.attribs?.id===id)[0];
const sourceJson = new Map();
const recordSource = row => 'maths4u / problems / '+row.id+'; source_meta_json.extra.mark_scheme_visible_in_solution';
const existingOcr = new Map();
async function indexExistingOcr(rows) {
  const wanted=new Set(rows.flatMap(r=>[r.source_uid,`${r.syllabus}_${r.series_code}_qp_${r.component}_q${String(r.question_no).replace(/^0+(?=\d)/,'').replace(/[eo]$/,'')}`]));
  for(const dir of ['D:/www/maths4u/output/ocr/mathpix','D:/www/maths4u/output/0606/ocr/mathpix']) {
    let names;try{names=await fs.readdir(dir);}catch(e){if(e.code==='ENOENT')continue;throw e;}
    for(const name of names.filter(n=>/^(0606|9231).*_ocr_questions\.json$/.test(n)).sort()) {
      const filename=path.join(dir,name),bytes=await fs.readFile(filename),json=JSON.parse(bytes.toString('utf8'));
      for(const item of json.items||[])if(wanted.has(item.source_uid)&&(item.mark_scheme_html||item.mark_scheme_text)&&!item.mathpix_parts?.mark_scheme?.error) {
        const candidate={html:item.mark_scheme_html,text:item.mark_scheme_text,source:name,sha256:hash(bytes),capturedAt:String(json.created_at||'')};
        const old=existingOcr.get(item.source_uid);if(!old||candidate.capturedAt>old.capturedAt)existingOcr.set(item.source_uid,candidate);
      }
    }
  }
}
async function legacyJson(filename) {
  if(!filename || !/^D:[\\/]www[\\/]maths4u[\\/]output[\\/]/i.test(filename) || !filename.endsWith('.json')) return null;
  const normalized=path.resolve(filename);if(!normalized.toLowerCase().startsWith(path.resolve('D:/www/maths4u/output').toLowerCase()+path.sep)) throw new Error('BANK_SOURCE_PATH');
  if(!sourceJson.has(normalized)) {try {sourceJson.set(normalized,JSON.parse(await fs.readFile(normalized,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;sourceJson.set(normalized,null);}}
  return sourceJson.get(normalized);
}
function compactHtml(html) {
  // Existing Mathpix HTML stores both hidden ASCII and LaTeX. Preserve LaTeX once.
  html=html.replace(/<asciimath\b[^>]*>[\s\S]*?<\/asciimath>/gi,'').replace(/<latex\b[^>]*>([\s\S]*?)<\/latex>/gi,(_m,t)=>'\\('+t+'\\)');
  return sanitizeHtml(protectMathHtml(html),{allowedTags:['p','br','strong','em','b','i','u','sub','sup','ul','ol','li','blockquote','h2','h3','h4','table','thead','tbody','tr','th','td'],allowedAttributes:{td:['colspan','rowspan'],th:['colspan','rowspan']}});
}
async function extraMaterial(row) {
  const meta=JSON.parse(row.source_meta_json||'{}'), source='maths4u / problems / '+row.id;
  const parts=meta.parts||meta.extra?.parts;
  let answer=meta.answer_html || meta.extra?.answer_html || '', ms='', msOrigin='', status='NONE';
  const solved=await legacyJson(meta.solved_json);
  const item=solved?.items?.find(i=>i.source_uid===row.source_uid);
  // A matching identity alone is insufficient when an older generated file differs from the current statement.
  if(!answer && item?.answer && typeof item.answer==='string' && item.question?.trim()===row.body_html.trim()) answer=item.answer;
  const ocrFile=await legacyJson(meta.source_files?.question_ocr_json),ocrItem=ocrFile?.items?.find(i=>i.source_uid===row.source_uid);
  const ocr=meta.extra?.mark_scheme_mathpix || meta.mathpix_parts?.mark_scheme || meta.mark_scheme_mathpix || ocrItem?.mathpix_parts?.mark_scheme;
  const raw=await legacyJson(ocr?.raw_path);
  const sameReference=raw&&(raw.source_uid===row.source_uid || (raw.paper_key===meta.paper_key && String(raw.question_no)===String(row.question_no).replace(/[eo]$/,'')));
  if(raw && raw.role==='mark_scheme' && sameReference && (!ocr.sha256||raw.image_sha256===ocr.sha256) && !raw.error && !raw.response?.error) {
    ms=raw.response?.html ? compactHtml(raw.response.html) : raw.response?.text ? esc(raw.response.text).replaceAll('\n','<br>') : '';
    if(ms) {status='OCR_UNVERIFIED';msOrigin=source+'; existing OCR, image SHA256 '+raw.image_sha256;}
  } else if(ocrItem?.mark_scheme_html || ocrItem?.mark_scheme_text) {ms=ocrItem.mark_scheme_html?compactHtml(ocrItem.mark_scheme_html):esc(ocrItem.mark_scheme_text).replaceAll('\n','<br>');status='OCR_UNVERIFIED';msOrigin=source+'; existing OCR item '+ocrItem.source_uid;}
  else if(typeof meta.mark_scheme_ocr_text==='string' && meta.mark_scheme_ocr_text.trim()) { ms=esc(meta.mark_scheme_ocr_text).replaceAll('\n','<br>');status='OCR_UNVERIFIED';msOrigin=source+'; source_meta_json.mark_scheme_ocr_text'; }
  if(!ms) {
    const examUid=`${row.syllabus}_${row.series_code}_qp_${row.component}_q${String(row.question_no).replace(/^0+(?=\d)/,'').replace(/[eo]$/,'')}`;
    const saved=existingOcr.get(row.source_uid)||existingOcr.get(examUid);
    if(saved) {ms=saved.html?compactHtml(saved.html):esc(saved.text).replaceAll('\n','<br>');status='OCR_UNVERIFIED';msOrigin=source+'; existing '+saved.source+'; SHA256 '+saved.sha256;}
  }
  const structured=Array.isArray(parts)&&parts.length>0&&parts.length<=30&&parts.every(p=>p.part&&Number(p.marks)>0)&&parts.reduce((n,p)=>n+Number(p.marks),0)===Number(row.marks);
  const resultParts=structured ? parts.map(p=>({kind:'MANUAL',maxPoints:Number(p.marks),texts:[{locale:'en',prompt:'<p>('+esc(p.part)+')</p>',answer:p.answer_html||'',rubric:p.rubric||'',
    markScheme:'',markSchemeText:Array.isArray(p.mark_scheme)?p.mark_scheme.map(m=>'<p><strong>'+esc(m.marks)+'</strong> '+(m.answer_html||'')+' '+esc(m.guidance||'')+'</p>').join(''):'',
    markSchemeStatus:Array.isArray(p.mark_scheme)&&p.mark_scheme.length?'SOURCE_TEXT':'NONE',markSchemeSource:source+'; source_meta_json.parts / '+p.part}]})) : [{kind:'MANUAL',maxPoints:Number(row.marks),texts:[{locale:'en',prompt:'',answer:'',rubric:''}]}];
  return {answer,ms,msOrigin,status,parts:resultParts,structured,embeddedMs:!!meta.extra?.mark_scheme_visible_in_solution};
}

export async function prepareBank() {
  const d=await sourceData(), inventory=JSON.parse(await fs.readFile(path.join(bankRoot,'inventory.json'),'utf8'));
  if(inventory.courses.some(c=>c.discrepancies.length)) throw new Error('BANK_SOURCE_DISCREPANCIES');
  await indexExistingOcr(d.rows);
  const output=path.join(bankRoot,'publish');await fs.mkdir(path.join(output,'assets'),{recursive:true});await fs.mkdir(path.join(output,'batches'),{recursive:true});
  const baseline=JSON.parse(await fs.readFile('.local/content-pilot/bundle.json','utf8'));
  const files=new Map(), records=new Map(), reports=[], errors=[], normalization=[], courseKeys={15:'0606',6:'9231-fp1',14:'9231-fp2',13:'9231-mechanics',12:'9231-statistics'};
  const normalized=(html,id,field)=>{let result=html;
    if(String(id)==='6658')result=result.replace('\\lt /p\\gt \\lt p\\gt \\(','\\)</p><p>\\(');
    result=normalizeSourceMath(result);if(result!==html)normalization.push({id,field,before:hash(html),after:hash(result),reason:'TeX/HTML delimiter encoding; mathematics unchanged'});return result;};
  async function asset(raw,role,caption,record) {
    const url=new URL(raw,'https://maths4u.sbs/');
    if(url.origin!=='https://maths4u.sbs'||!url.pathname.startsWith('/uploads/problems/')||url.search||url.hash||!url.pathname.toLowerCase().endsWith('.png')) throw new Error('BANK_ASSET_URL');
    const lookup=role+':'+url.href;
    if(files.has(lookup)) return files.get(lookup);
    const local=path.resolve(legacyRoot,'AS-Alevel','.'+decodeURIComponent(url.pathname));
    if(!local.startsWith(path.resolve(legacyRoot,'AS-Alevel')+path.sep)) throw new Error('BANK_ASSET_PATH');
    let bytes,origin='local source file';
    try {bytes=await fs.readFile(local);}catch(e){if(e.code!=='ENOENT')throw e;const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});
      if(r.ok){bytes=Buffer.from(await r.arrayBuffer());origin='public source download';}
      else {
        const row=d.rows.find(r=>String(r.id)===record.id),meta=JSON.parse(row.source_meta_json||'{}');
        const original=role==='STATEMENT' ? meta.source_files?.question_image : null;
        if(!original||!/^D:[\\/]www[\\/]maths4u[\\/]output[\\/]/i.test(original)||!original.endsWith('.png'))throw new Error('BANK_ASSET_HTTP_'+r.status);
        bytes=await fs.readFile(original);origin='Recovered original question crop from source_meta_json.source_files.question_image; source URL HTTP '+r.status;
        errors.push({id:record.id,sourceUrl:url.href,reason:'BROKEN_SOURCE_IMAGE',recovery:origin});
      }
    }
    if(bytes.length>1024*1024 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('BANK_ASSET_TYPE_OR_SIZE');
    const sha256=hash(bytes),prior=baseline.assets.find(a=>a.sourceUrl===url.href && a.sha256===sha256 && a.legacyId===record.id && (a.role===role || a.role==='SOLUTION'&&role==='MARK_SCHEME'));
    const id=prior?'pilot_'+prior.key:'bank_'+hash('maths4u:'+role+':'+url.href+':'+sha256).slice(0,40);
    const a={id,sha256,size:bytes.length,mimeType:'image/png',file:`assets/${sha256}.png`,sourceUrl:url.href,role,origin};
    await fs.writeFile(path.join(output,a.file),bytes);files.set(lookup,a);return a;
  }
  async function rewrite(html,role,record) {
    let result=html;
    const vectors=all(parse(html),n=>n.name==='svg');
    for(const svg of vectors.reverse()) {let original=outer(svg,html);if(!/\bxmlns=/.test(original))original=original.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"');const bytes=Buffer.from(original),sha256=hash(bytes);verifyBankSvg(bytes);
      const id='bank_'+hash('maths4u:svg:'+role+':'+record.id+':'+sha256).slice(0,40),a={id,sha256,size:bytes.length,mimeType:'image/svg+xml',file:'assets/'+sha256+'.svg',sourceUrl:record.sourceUrl,role,origin:'Original inline SVG; namespace added for standalone rendering'};
      files.set(role+':'+id,a);await fs.writeFile(path.join(output,a.file),bytes);if(!record.material.assets.some(x=>x.fileId===id))record.material.assets.push({fileId:id,role,locale:'en',caption:svg.attribs['aria-label']||'',partPosition:null});
      result=result.slice(0,svg.startIndex)+'<img src="/api/files/'+id+'" alt="'+esc(svg.attribs['aria-label']||'')+'">'+result.slice(svg.endIndex+1);
    }
    html=result;
    for(const img of images(parse(html)).reverse()) {if(img.attribs.src.startsWith('/api/files/'))continue;const a=await asset(img.attribs.src,role,img.attribs.alt,record);
      if(!record.material.assets.some(x=>x.fileId===a.id&&x.role===role))record.material.assets.push({fileId:a.id,role,locale:'en',caption:img.attribs.alt||'',partPosition:null});
      result=result.slice(0,img.startIndex)+'<img src="/api/files/'+a.id+'" alt="'+esc(img.attribs.alt||'')+'">'+result.slice(img.endIndex+1);
    }return result;
  }
  const structure=[];
  for(const c of d.courses) {
    const chapters=d.chapters.filter(ch=>ch.course_id===c.id),course={key:courseKeys[c.id],sourceId:String(c.id),title:c.name,description:c.id===15?'Cambridge 0606':'Cambridge 9231 · Paper '+({6:1,14:2,13:3,12:4}[c.id]),position:d.courses.indexOf(c),groupLabel:c.id===15?null:'Further Mathematics 9231',chapters:[]};
    const report={course:c.name,chapters:chapters.length,subtopics:0,tasks:0,links:0,solutions:0,markSchemes:0,transcriptions:0,structuredParts:0,missingMarkSchemes:[],missingSolutions:[],missingAnswers:[],missingRu:[],theory:0,examples:0,sourceDifferences:[],formulaErrors:[],sourcePartsEmbedded:[]};
    for(const ch of chapters) {
      const chapter={key:'chapter-'+ch.id,title:ch.name,position:ch.sort_order,lessons:[]};course.chapters.push(chapter);
      const chapterHtml=await page('chapter-'+ch.id,'/chapter.php?id='+ch.id),chapterDoc=parse(chapterHtml);
      const heading=all(chapterDoc,n=>n.name==='h1')[0];if(!heading||textContent(heading).trim()!==ch.name.trim())throw new Error('BANK_CHAPTER_TITLE_CHANGED');
      for(const s of d.subchapters.filter(s=>s.chapter_id===ch.id)) {
        report.subtopics++;
        const lesson={key:'subchapter-'+s.id,title:s.name,position:s.sort_order,texts:[{locale:'en',title:s.name,body:'',examples:''}]};
        for(const locale of ['en','ru']) {
          const notesHtml=await page(`notes-${s.id}-${locale}`,`/notes.php?subchapter_id=${s.id}&lang=${locale}`),doc=parse(notesHtml);
          const blocks=all(doc,n=>hasClass(n,'card')&&all(n,x=>hasClass(x,'notes-content')).length);
          const body=blocks.filter(n=>textContent(all(n,x=>hasClass(x,'card-header'))[0]||{children:[]}).includes('Notes')).flatMap(n=>all(n,x=>hasClass(x,'notes-content')).map(n=>inner(n,notesHtml))).join('\n');
          const examples=blocks.filter(n=>textContent(all(n,x=>hasClass(x,'card-header'))[0]||{children:[]}).includes('Examples')).flatMap(n=>all(n,x=>hasClass(x,'notes-content')).map(n=>inner(n,notesHtml))).join('\n');
          if(body||examples){if(images(parse(body+examples)).length)throw new Error('BANK_LESSON_MEDIA_REQUIRES_MAPPING');const t={locale,title:s.name,body,examples};if(locale==='en')lesson.texts[0]=t;else lesson.texts.push(t);report.theory+=!!body;report.examples+=!!examples;}
        }
        chapter.lessons.push(lesson);
        const html=protectMathHtml(await page('problems-'+s.id,'/problems.php?subchapter_id='+s.id+'&filter=all')),doc=parse(html),cards=all(doc,n=>n.attribs?.['data-problem-card-id']);
        for(const [position,card]of cards.entries()) {
          const id=card.attribs['data-problem-card-id'],row=d.rows.find(r=>String(r.id)===id);if(!row)throw new Error('BANK_METADATA_MISSING');
          const link={courseKey:course.key,chapterKey:chapter.key,lessonKey:lesson.key,position};report.links++;
          if(records.has(id)){records.get(id).links.push(link);continue;}
          const body=all(card,n=>hasClass(n,'card-body'))[0],marker=body.children.findIndex(n=>n.type==='comment'&&n.data.trim()==='Problem text'),statementNode=body.children.slice(marker+1).find(n=>n.type==='tag');
          if(marker<0||!hasClass(statementNode,'mt-3'))throw new Error('BANK_STATEMENT_SHAPE');
          const sol=byId(card,'sol-'+id),mk=byId(card,'mk-'+id),solText=sol&&all(sol,n=>hasClass(n,'mb-2')&&!hasClass(n,'d-flex'))[0];
          const statementHtml=inner(statementNode,html),solutionHtml=inner(solText,html),nested=new Set([...images(statementNode),...(sol?images(sol):[]),...(mk?images(mk):[])]);
          if(statementHtml!==protectMathHtml(row.body_html.trim())||solutionHtml!==protectMathHtml((row.solution_html||'').trim()))report.sourceDifferences.push({id,statement:statementHtml!==protectMathHtml(row.body_html.trim()),solution:solutionHtml!==protectMathHtml((row.solution_html||'').trim())});
          const extra=await extraMaterial(row),solutionDoc=parse(solutionHtml),first=solutionDoc.children.find(n=>n.type==='tag');let answer=extra.answer,solution=solutionHtml,embeddedMs='';
          if(first?.name==='p' && /^Answer\s*:/i.test(textContent(first).trim()) && all(first,n=>n.name==='strong'&&/^Answer\s*:/i.test(textContent(n).trim())).length) {
            let last=first;if(/^Answer\s*:\s*$/i.test(textContent(first).trim())){const next=solutionDoc.children.slice(solutionDoc.children.indexOf(first)+1).find(n=>n.type==='tag');if(next&&['ol','p'].includes(next.name))last=next;}
            answer=solutionHtml.slice(first.startIndex,last.endIndex+1);solution=solutionHtml.slice(last.endIndex+1).trim();
          }
          // Only the source's explicit structured-MS marker permits moving this DOM block.
          if(extra.embeddedMs){const doc=parse(solution),heading=all(doc,n=>n.name==='h3'&&textContent(n).trim()==='Mark scheme')[0];if(heading){const tail=solution.slice(heading.startIndex);if(!all(parse(tail),n=>n.name==='table').length)throw new Error('BANK_EMBEDDED_MS_SHAPE');embeddedMs=tail;solution=solution.slice(0,heading.startIndex).replace(/<hr\s*\/?>\s*$/,'').trim();}}
          const record={table:'problems',id,sourceUrl:'https://maths4u.sbs/problems.php?subchapter_id='+s.id+'&filter=all#card-'+id,sourcePublished:!!row.is_published,links:[link],material:{visibility:'PRIVATE',source:row.exam_board||'Cambridge',materialCategory:'EXAM',sourceUid:row.source_uid||undefined,sourceReference:'https://maths4u.sbs/problems.php?subchapter_id='+s.id+'&filter=all#card-'+id,component:row.component||undefined,seriesCode:row.series_code||undefined,qualification:row.qualification||undefined,syllabus:row.syllabus||undefined,examBoard:row.exam_board||undefined,year:row.exam_year||undefined,examSession:row.exam_session||undefined,paper:row.component||undefined,questionNumber:row.question_no||undefined,
            texts:[{locale:'en',title:row.title,statement:statementHtml+images(card).filter(n=>!nested.has(n)).map(n=>outer(n,html)).join(''),answer,hint:'',solution:solution+(sol?images(sol).filter(n=>!solText||!images(solText).includes(n)).map(n=>outer(n,html)).join(''):''),markScheme:mk?inner(mk,html):'',markSchemeText:embeddedMs||extra.ms,markSchemeStatus:embeddedMs?'SOURCE_TEXT':extra.status,markSchemeSource:embeddedMs?recordSource(row):extra.msOrigin||(mk?'https://maths4u.sbs/problems.php?subchapter_id='+s.id+'&filter=all#mk-'+id:''),teacherNote:''}],parts:extra.parts,assets:[]}};
          for(const [field,role]of Object.entries({statement:'STATEMENT',answer:'ANSWER',hint:'HINT',solution:'SOLUTION',markScheme:'MARK_SCHEME'}))record.material.texts[0][field]=await rewrite(normalized(record.material.texts[0][field],id,field),role,record);
          for(const [field,value]of Object.entries(record.material.texts[0]).filter(([k])=>['statement','answer','solution','markScheme'].includes(k))) {const audit=formulaAudit(value);if(audit.errors.length||audit.unpairedDelimiter)report.formulaErrors.push({id,field,...audit});}
          report.tasks++;report.solutions+=!!record.material.texts[0].solution;report.markSchemes+=!!(record.material.texts[0].markScheme||record.material.texts[0].markSchemeText);report.transcriptions+=!!record.material.texts[0].markSchemeText;report.structuredParts+=extra.structured?extra.parts.length:0;
          if(!extra.structured && /\([a-ivx]+\)/i.test(textContent(parse(statementHtml))))report.sourcePartsEmbedded.push(id);
          if(!record.material.texts[0].markScheme&&!record.material.texts[0].markSchemeText)report.missingMarkSchemes.push(id);if(!solution)report.missingSolutions.push(id);if(!answer)report.missingAnswers.push(id);report.missingRu.push(id);
          records.set(id,record);if(records.size%250===0)console.log('Prepared tasks: '+records.size);
        }
      }
    }structure.push(course);reports.push(report);
  }
  const batches=[];
  async function writeBatch(kind,payload) {const key=kind+'-'+String(batches.filter(b=>b.kind===kind).length+1).padStart(4,'0'),bytes=canonicalJson(payload);if(Buffer.byteLength(bytes)>512*1024)throw new Error('BANK_BATCH_TOO_LARGE');await fs.writeFile(path.join(output,'batches',key+'.json'),bytes);batches.push({key,kind,sha256:hash(bytes),count:payload.length});}
  for(const course of structure)for(const chapter of course.chapters)await writeBatch('structure',[{...course,chapters:[chapter]}]);
  const assets=[...files.values()],rows=[...records.values()];for(let i=0;i<assets.length;i+=80)await writeBatch('assets',assets.slice(i,i+80));for(let i=0;i<rows.length;i+=5)await writeBatch('tasks',rows.slice(i,i+5));
  const manifest={format:'maths4u-bank-v1',selection:'0606-9231-five-courses',courses:structure.map(({chapters,...c})=>({...c,chapterCount:chapters.length})),tasks:rows.length,files:assets.length,bytes:assets.reduce((n,a)=>n+a.size,0),batches};
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
  await fs.writeFile(path.join(bankRoot,'report.json'),JSON.stringify({courses:reports,errors,normalization,totals:{tasks:rows.length,files:assets.length,bytes:manifest.bytes,batches:batches.length},manifestHash:hash(JSON.stringify(manifest))},null,2));
  console.log(JSON.stringify({tasks:rows.length,files:assets.length,bytes:manifest.bytes,batches:batches.length,formulaErrors:reports.reduce((n,r)=>n+r.formulaErrors.length,0),sourceDifferences:reports.reduce((n,r)=>n+r.sourceDifferences.length,0)}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareBank().catch(e=>{console.error(/^BANK_[A-Z0-9_]+$/.test(e.message)?e.message:'BANK_PREPARATION_FAILED');process.exitCode=1;});
