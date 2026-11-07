import katex from 'katex';
// A display adapter for compact legacy plaintext algebra, never a content edit.
// Already-rendered TeX stays byte-for-byte intact. Ordinary words and mark codes
// cannot match the single-letter algebra grammar; no expressions are evaluated.
export function formatTeacherGuidance(html:string){
  if(/class=["'][^"']*katex/.test(html))return html;
  const atom='(?:[+-]?(?:\\d+(?:\\.\\d+)?)?[a-zA-Z](?:\\^\\d+)?|[+-]?\\d+(?:\\.\\d+)?)';
  const pattern=new RegExp('(?<![A-Za-z0-9_])'+atom+'(?:(?:[=+*/-]|&gt;|&lt;)'+atom+')+(?![A-Za-z0-9_])','g');
  return html.split(/(<[^>]*>)/g).map((chunk,index)=>index%2?chunk:chunk.replace(pattern,raw=>{if(!/[a-zA-Z^/]/.test(raw))return raw;let tex=raw.replaceAll('&gt;','>').replaceAll('&lt;','<').replace(/\^(\d+)/g,'^{$1}');tex=tex.replace(/([a-zA-Z](?:\^\{\d+\})?|\d+(?:\.\d+)?)\/([a-zA-Z](?:\^\{\d+\})?|\d+(?:\.\d+)?)/g,'\\frac{$1}{$2}');try{return katex.renderToString(tex,{throwOnError:true,trust:false,strict:'error',output:'htmlAndMathml',maxSize:10,maxExpand:100});}catch{return raw;}})).join('');
}
