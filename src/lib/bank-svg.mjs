import { parseDocument } from 'htmlparser2';
import { findAll } from 'domutils';

// Bank-only static vectors. Student upload types and limits are unchanged.
export function verifyBankSvg(bytes) {
  if(bytes.length>1024*1024)throw new Error('BANK_SVG_SIZE');
  const raw=bytes.toString('utf8');
  if(/<!DOCTYPE|<!ENTITY|<\?|<script|<foreignObject/i.test(raw))throw new Error('BANK_SVG_UNSAFE');
  const doc=parseDocument(raw,{xmlMode:true}), roots=doc.children.filter(n=>n.type!=='text'||n.data.trim());
  if(roots.length!==1||roots[0].name!=='svg')throw new Error('BANK_SVG_ROOT');
  const tags=new Set(['svg','g','path','line','polyline','polygon','rect','circle','ellipse','text','tspan','defs','marker','title','desc']);
  const attributes=new Set(['xmlns','viewBox','width','height','role','aria-label','id','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','fill-opacity','stroke-opacity','transform','font-size','font-family','font-weight','text-anchor','dominant-baseline','marker-end','marker-start','markerWidth','markerHeight','refX','refY','orient']);
  for(const n of [roots[0],...findAll(n=>!!n.name,roots[0].children)]) {
    if(!tags.has(n.name))throw new Error('BANK_SVG_TAG');
    for(const [key,value]of Object.entries(n.attribs||{})) {
      if(!attributes.has(key)||value.includes('\\')||/javascript:|data:|https?:|@import|expression\s*\(/i.test(value)&&key!=='xmlns'||/url\s*\((?!#[\w-]+\))/i.test(value))throw new Error('BANK_SVG_ATTRIBUTE');
      if(key==='xmlns'&&value!=='http://www.w3.org/2000/svg')throw new Error('BANK_SVG_NAMESPACE');
    }
  }
}
