import test from "node:test";import assert from "node:assert/strict";
import {cleanAuthoredMarkup,cleanAuthoredTitle} from "../src/lib/content-text-cleanup";
import {hiddenMaterial} from "../src/lib/content-access";
test("approved wrapper cleanup keeps the complete mathematical payload byte for byte",()=>{
 const core=String.raw`<p>Find \(x\) for \(x^2-5x+6=0\).</p><ol><li>Explain. [3]</li></ol>`;
 assert.equal(cleanAuthoredMarkup('<p><strong>Maths4U Original · M4U-ORIG-Q-01 · 8 marks</strong></p>'+core),core);
 assert.equal(cleanAuthoredMarkup('<p><strong>Maths4U Original</strong> · Keep both roots.</p>'+core+'<p>AI-assisted preparation from independent skill briefs. Teacher editorial review is pending.</p>'),'<p>Keep both roots.</p>'+core);
 assert.equal(cleanAuthoredTitle('Quadratics · Maths4U Original'),'Quadratics');
 assert.equal(cleanAuthoredMarkup(core),core);assert.equal(cleanAuthoredMarkup('<p>8 marks. M4U-example is part of this explanation.</p>'),'<p>8 marks. M4U-example is part of this explanation.</p>');
});
test("new UNKNOWN content is denied, even with a manual UNKNOWN mark; approved original remains open",()=>{
 const base={examArchivedAt:null,originManual:false};assert.equal(hiddenMaterial(null,{...base,origin:'UNKNOWN'}),true);assert.equal(hiddenMaterial(null,{...base,origin:'UNKNOWN',originManual:true}),true);assert.equal(hiddenMaterial(null,{...base,origin:'ORIGINAL'}),false);assert.equal(hiddenMaterial(null,{...base,origin:'OTHER_THIRD_PARTY'}),true);assert.equal(hiddenMaterial(null,{...base,origin:'OTHER_THIRD_PARTY',originManual:true}),false);assert.equal(hiddenMaterial(null,{...base,origin:'DEMO',originManual:true,examArchivedAt:new Date()}),true);
});
