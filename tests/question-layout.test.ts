import test from "node:test";
import assert from "node:assert/strict";
import {renderContent} from "../src/lib/content";
import {contentPackages} from "../src/lib/content-package-content";
import {parseDocument} from "htmlparser2";
import {findAll,textContent} from "domutils";

test("Question rendering retains alphabetical parts and marks without allowing arbitrary HTML attributes",()=>{
 const html=renderContent('<ol type="a" class="parts arbitrary" style="color:red" onclick="alert(1)"><li><p>Find x.</p><span class="marks arbitrary" style="position:fixed" onmouseover="alert(1)">[3]</span></li><li><p>Explain.</p>[2]</li></ol><script>alert(1)</script>');
 assert(html.includes('<ol type="a" class="parts">'));
 assert.equal((html.match(/class="marks"/g)??[]).length,2);
 assert.equal(renderContent('<ol type="a"><li>Find x. [3]</li></ol>'),'<ol type="a"><li>Find x. <span class="marks">[3]</span></li></ol>');
 for(const unsafe of ["arbitrary","style=","onclick","onmouseover","<script","alert("])assert(!html.includes(unsafe),unsafe);
 assert.equal(renderContent('<p>Use [3] as an index.</p>'),'<p>Use [3] as an index.</p>');
 assert.equal(renderContent('<ol><li>A numbered method.</li><li>A second step.</li></ol>'),'<ol><li>A numbered method.</li><li>A second step.</li></ol>');
});

test("All five FP1 chapter questions retain the same part count and marks in their catalogue projection",()=>{
 let questions=0;
 for(const pack of contentPackages)for(const q of pack.questions.filter(q=>q.collection==="exam")){
  const raw=parseDocument(q.prompt_html),before=findAll(n=>n.name==="ol"&&(n.attribs.type==="a"||n.attribs.class==="parts"),raw.children);
  if(!before.length)continue;
  const html=renderContent(q.prompt_html),after=findAll(n=>n.name==="ol"&&(n.attribs.type==="a"||n.attribs.class==="parts"),parseDocument(html).children);
  assert.equal(after.length,before.length,q.id);
  const marks=(nodes:typeof before)=>nodes.flatMap(n=>findAll(v=>v.name==="li",n.children).map(v=>(textContent(v).match(/\[(\d+)\]\s*$/)??[])[1]));
  assert.deepEqual(marks(after),marks(before),q.id);
  assert(!html.includes("katex-error"),q.id);questions++;
 }
 assert(questions>=300);
});
