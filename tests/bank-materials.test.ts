import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displayBankFieldLabel,renderContent,taskSchema} from '../src/lib/content';
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
test('image alt text describes formulas while live assessments suppress descriptions',()=>{
  const raw=String.raw`<img src="/api/files/graph" alt="Graph of \(y=f(x)\), with \(x&lt;\frac12\)." onerror="alert(1)"><p>\(x=0\)</p>`;
  const rendered=renderContent(raw);
  assert.match(rendered, /<img src="\/api\/files\/graph" alt="Graph of y=f\(x\), with x&lt;fraction \(1\) over \(2\)\."\s*\/>/);
  assert.match(rendered, /class="katex"/);
  assert.doesNotMatch(rendered, /MATHS4UFORMULA|onerror/);
  const anonymous=renderContent(raw,true);
  assert.match(anonymous, /<img src="\/api\/files\/graph" alt=""\s*\/>/);
  assert.match(anonymous, /class="katex"/);
  assert.doesNotMatch(anonymous, /Graph of|MATHS4UFORMULA|onerror/);
});
test('reviewed bank display typesets legacy fractions and roots without altering other strings',()=>{
  const root=renderContent('sqrt(r²+(dr/dθ)²)');
  assert.match(root, /<msqrt>/);
  assert.match(root, /<mfrac>/);
  assert.doesNotMatch(root, /sqrt\(r/);
  const legacy=String.raw`<p>When x=a cosh u with a>0 and u≥0, what is sqrt(\(x^{2}\)−\(a^{2}\))?</p>`;
  assert.match(renderContent(legacy), /<msqrt>/);
  assert.doesNotMatch(renderContent(legacy), /sqrt\(/);
  const answer=renderContent('<p>All positive u-roots: <span>{7/8 - sqrt(33)/8,sqrt(33)/8 + 7/8}</span></p>');
  assert.equal((answer.match(/<mfrac>/g)??[]).length,4);
  assert.equal(displayBankFieldLabel('Shared speed divided by sqrt(ag)'), 'Shared speed divided by √(ag)');
  assert.equal(displayBankFieldLabel('Date 1/3'), 'Date 1/3');
  assert.equal(renderContent('<p>Recorded on 1/3.</p>'), '<p>Recorded on 1/3.</p>');
});
test('bank SVG accepts static original vectors and rejects active or external content',()=>{
  verifyBankSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><marker id="a"><path d="M0 0 L1 1"/></marker></defs><line x1="0" y1="0" x2="10" y2="10" marker-end="url(#a)"/></svg>'));
  for(const fragment of ['<script/>','<foreignObject/>','<image href="https://example.com/a"/>','<path onclick="alert(1)"/>','<path style="fill:url(https://example.com/a)"/>','<path fill="url(https://example.com/a)"/>','<path fill="URL(//example.com/a)"/>',String.raw`<path fill="u\72l(//example.com/a)"/>`])assert.throws(()=>verifyBankSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'+fragment+'</svg>')));
});
test('changing an image from solution to MS moves its inline reference only',()=>{
  const t=taskSchema.parse({texts:[{locale:'en',title:'T',statement:'Statement',solution:'<p>Derivation</p><img src="/api/files/a" alt="diagram">',markScheme:'<p>MS</p>'}],parts:[{kind:'MANUAL',maxPoints:1,texts:[{locale:'en'}]}],assets:[{fileId:'a',role:'SOLUTION'}]});
  reassignAsset(t,0,'MARK_SCHEME');assert.equal(t.texts[0].solution,'<p>Derivation</p>');assert.equal(t.texts[0].markScheme,'<p>MS</p><img src="/api/files/a" alt="diagram">');assert.equal(t.assets[0].role,'MARK_SCHEME');
});
