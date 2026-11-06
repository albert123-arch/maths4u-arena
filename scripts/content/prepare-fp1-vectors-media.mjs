// Extract only owner model figures, never pre-rendered formula SVGs or book images.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parseDocument} from 'htmlparser2';
import {findAll,textContent} from 'domutils';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).reduce((rows,v,i,all)=>i%2?rows:[...rows,[v.replace(/^--/,''),all[i+1]]],[]));
assert(args.source&&args.html&&args.metadata);
const bank=JSON.parse(await fs.readFile(args.source,'utf8')),htmlBytes=await fs.readFile(args.html),html=htmlBytes.toString('utf8'),doc=parseDocument(html,{withStartIndices:true,withEndIndices:true});
const articles=findAll(e=>e.name==='article'&&!!e.attribs['data-number'],doc.children),assets=[];
const out='content/original/9231-fp1/vectors-assets';await fs.mkdir(out,{recursive:true});
for(const q of bank.lessons.flatMap(l=>l.questions)){
 const matches=articles.filter(e=>e.attribs['data-number']===String(q.bank_number));assert.equal(matches.length,1);const article=matches[0];assert(textContent(article).includes(q.title));
 const images=findAll(e=>e.name==='svg'&&e.parent?.name==='figure'&&e.parent.attribs.class==='model-figure',[article]),refs=findAll(e=>e.name==='img',parseDocument(q.solution_html).children);
 assert.equal(images.length,refs.length);assert.equal(refs.length,q.images.length);
 for(const [index,img] of images.entries()){
  let ancestor=img.parent;while(ancestor&&ancestor.type!=='root'&&ancestor.attribs?.['data-role']!=='solution')ancestor=ancestor.parent;
  assert(ancestor?.attribs?.['data-role']==='solution');
  const ref=refs[index];assert(q.images.includes(ref.attribs.src));
  const title=findAll(e=>e.name==='title',[img]);assert.equal(title.length,1);assert.equal(textContent(title[0]),'Question '+q.bank_number+': '+ref.attribs.alt);
  const raw=html.slice(img.startIndex,img.endIndex+1),svg=Buffer.from(raw,'utf8');
  assert(!/<script|(?:href|src)=["'](?:https?:|file:)/i.test(raw));
  const {data,info}=await sharp(svg,{density:192}).resize({width:1600,height:1600,fit:'inside'}).png({compressionLevel:9}).toBuffer({resolveWithObject:true});
  const sha256=createHash('sha256').update(data).digest('hex'),path=out+'/'+sha256+'.png';
  await fs.writeFile(path,data);
  assets.push({question_uid:q.content_uid,file_id:'pkg_vc_'+String(q.bank_number).padStart(2,'0')+String.fromCharCode(97+index)+'_'+sha256,path,sha256,size:data.length,width:info.width,height:info.height,mime:'image/png',role:'SOLUTION',caption:ref.attribs.alt,source_name:ref.attribs.src,source_sha256:createHash('sha256').update(svg).digest('hex')});
 }
}
assert.equal(assets.length,8);assert.equal(new Set(assets.map(a=>a.file_id)).size,8);
const result={mediaSource:{path:args.html,sha256:createHash('sha256').update(htmlBytes).digest('hex')},images:assets};
await fs.writeFile(args.metadata,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ownerFigures:assets.length,uniquePngs:new Set(assets.map(a=>a.path)).size,totalBytes:assets.reduce((sum,a)=>sum+a.size,0)}));
