import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import postcss from 'postcss';

const css=await fs.readFile('src/app/tokens.css','utf8'),tree=postcss.parse(css);
const themes={light:{},dark:{}};
tree.walkRules(rule=>{
  if(rule.selector===':root')rule.walkDecls(d=>{themes.light[d.prop]=d.value;themes.dark[d.prop]=d.value;});
  if(rule.selector===':root[data-theme="dark"]')rule.walkDecls(d=>{themes.dark[d.prop]=d.value;});
});
function resolve(tokens,name){
  const value=tokens[name];assert.ok(value,`Missing token ${name}`);
  return value.startsWith('var(')?resolve(tokens,value.slice(4,-1)):value;
}
function luminance(hex){
  assert.match(hex,/^#[\da-f]{6}$/i);
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
const pairs=[];
const pair=(fg,bg,min,kind='text')=>pairs.push({fg:'--c-'+fg,bg:'--c-'+bg,min,kind});
for(const bg of ['page','surface','surface-muted']){
  for(const fg of ['text','text-muted','primary'])pair(fg,bg,4.5);
  pair('border-strong',bg,3,'field boundary');pair('focus',bg,3,'focus');
}
for(const bg of ['primary','primary-hover'])pair('on-primary',bg,4.5,'button text');
for(const state of ['success','warning','hint','danger']){
  pair(state+'-text',state+'-bg',4.5);pair(state,state+'-bg',3,'status icon');
  pair(state+'-text','surface',4.5);
}
for(const fg of ['on-header','header-link']){pair(fg,'header',4.5);pair(fg,'header-selected',4.5);}
pair('header-border','header',3,'header control boundary');
pair('board-text','board',4.5);pair('board-muted','board-toolbar',4.5);
const results=[];
for(const [theme,tokens]of Object.entries(themes))for(const {fg,bg,min,kind}of pairs){
  const f=resolve(tokens,fg),b=resolve(tokens,bg),l1=luminance(f),l2=luminance(b),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  results.push({theme,fg,bg,foreground:f,background:b,kind,ratio:Number(ratio.toFixed(3)),minimum:min,pass:ratio>=min});
}
const automatic=tree.nodes.find(n=>n.type==='atrule'&&n.params==='(prefers-color-scheme: dark)')?.nodes.find(n=>n.selector===':root:not([data-theme="light"])');
assert.ok(automatic,'System dark theme missing');
const auto=Object.fromEntries(automatic.nodes.filter(n=>n.type==='decl').map(d=>[d.prop,d.value]));
for(const [name,value]of Object.entries(auto))assert.equal(value,themes.dark[name],`Dark theme mismatch: ${name}`);
// Source audit ignores authored question SVG data and generated/vendor CSS.
const sourceFiles=['src/app/globals.css','src/app/discovery.css','src/app/learning.css','src/app/components.css','public/platform-statistics.css','public/favicon.svg'];
for(const name of await fs.readdir('src/components'))if(name.endsWith('.tsx'))sourceFiles.push('src/components/'+name);
const violations=[];
for(const file of sourceFiles){const text=await fs.readFile(file,'utf8');
  if(/#[\da-f]{3,8}\b/i.test(text))violations.push(file+': hard-coded color');
  if(/style=\{\{[^}]*\b(?:color|background|margin|padding|width|height|fontSize)\s*:/s.test(text))violations.push(file+': static inline presentation');
  if(file.endsWith('.css'))postcss.parse(text).walkDecls('font-size',d=>{if(!d.value.startsWith('var('))violations.push(file+': font-size '+d.value);});
}
const failed=results.filter(x=>!x.pass),report={standard:'WCAG 2.1 relative luminance; no rounding before comparison',pairs:results.length,passed:results.length-failed.length,failed,violations,results};
await fs.mkdir('test-results/foundation-20261105',{recursive:true});
await fs.writeFile('test-results/foundation-20261105/contrast.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({pairs:results.length,failed,violations},null,2));
if(failed.length||violations.length)process.exitCode=1;
