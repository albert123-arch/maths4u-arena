import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderContent,taskSchema} from '../src/lib/content';
import {verifyBankSvg} from '../src/lib/bank-svg.mjs';
import {reassignAsset} from '../src/lib/asset-association';
import {canonicalJson} from '../src/lib/canonical-json.mjs';
test('batch checksums tolerate native MySQL JSON key order while retaining arrays',()=>{
  assert.equal(canonicalJson({z:[{b:2,a:1}],a:0}),canonicalJson({a:0,z:[{a:1,b:2}]}));assert.notEqual(canonicalJson([1,2]),canonicalJson([2,1]));
});
test('complete TeX survives entity boundaries, matrices and escaped currency',()=>{
  for(const raw of [String.raw`\[F(x)=\begin{cases}0,&x<0,\\[2mm]1-e^{-x},&x\ge0.\end{cases}\]`,String.raw`\(a &lt; b\) and \(x&gt;1\)`,String.raw`\[\begin{array}{cc}1&2\\[4pt]3&4\end{array}\]`]){const h=renderContent(raw);assert.ok(h.includes('class="katex"'));assert.ok(!h.includes('katex-error'));assert.ok(!h.includes('MATHS4UFORMULA'));}
  assert.ok(!renderContent(String.raw`Price \$5 and \$7`).includes('class="katex"'));
});
test('formula rendering preserves the HTML security boundary',()=>{
  const h=renderContent(String.raw`<img src="/api/files/safe" alt="\(x\)"><script>alert(1)</script><a href="javascript:alert(1)">bad</a>\(\href{javascript:alert(1)}{x}\)`);
  assert.ok(!h.includes('<script'));assert.ok(!h.includes('href="javascript:'));assert.ok(!/<img[^>]*<span/.test(h));
});
test('bank SVG accepts static original vectors and rejects active or external content',()=>{
  verifyBankSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><marker id="a"><path d="M0 0 L1 1"/></marker></defs><line x1="0" y1="0" x2="10" y2="10" marker-end="url(#a)"/></svg>'));
  for(const fragment of ['<script/>','<foreignObject/>','<image href="https://example.com/a"/>','<path onclick="alert(1)"/>','<path style="fill:url(https://example.com/a)"/>','<path fill="url(https://example.com/a)"/>'])assert.throws(()=>verifyBankSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'+fragment+'</svg>')));
});
test('changing an image from solution to MS moves its inline reference only',()=>{
  const t=taskSchema.parse({texts:[{locale:'en',title:'T',statement:'Statement',solution:'<p>Derivation</p><img src="/api/files/a" alt="diagram">',markScheme:'<p>MS</p>'}],parts:[{kind:'MANUAL',maxPoints:1,texts:[{locale:'en'}]}],assets:[{fileId:'a',role:'SOLUTION'}]});
  reassignAsset(t,0,'MARK_SCHEME');assert.equal(t.texts[0].solution,'<p>Derivation</p>');assert.equal(t.texts[0].markScheme,'<p>MS</p><img src="/api/files/a" alt="diagram">');assert.equal(t.assets[0].role,'MARK_SCHEME');
});
