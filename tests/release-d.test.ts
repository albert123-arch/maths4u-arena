import test from "node:test";
import assert from "node:assert/strict";
import { releaseDBlocks, releaseDMaterials, releaseDFingerprint } from "../src/lib/release-d";
import { classifyTask } from "../src/lib/content-origin";
import { restrictedMaterial, approvedWhere } from "../src/lib/content-access";
import { cambridgeTask } from "../src/lib/cambridge-access";
import { renderContent } from "../src/lib/content";

test("Release D bundles exactly the approved 100 written + 208 short + 208 fresh questions", () => {
  assert.equal(releaseDBlocks.length,10);
  assert.equal(releaseDMaterials.length,516);
  assert.equal(new Set(releaseDMaterials.map(m=>m.material.sourceUid)).size,516);
  assert.equal(releaseDMaterials.filter(m=>m.key.startsWith("original:")).length,100);
  assert.match(releaseDFingerprint,/^[a-f0-9]{64}$/);
  for(const {material} of releaseDMaterials) {
    assert.equal(material.visibility,"PUBLIC");
    assert.equal(material.source,"Maths4U Original (AI-assisted)");
    for(const t of material.texts) {
      assert(!t.title.includes("Maths4U Original"));
      assert(!t.statement.includes("AI-assisted preparation"));
      assert(!t.statement.includes("Maths4U Original · M4U-"));
      for(const html of [t.statement,t.hint,t.answer??"",t.solution,t.markScheme??""])assert(!renderContent(html).includes('class="katex-error"'));
    }
  }
});

test("H1 survives manual restoration and a newer original version over old Cambridge provenance", () => {
  assert.deepEqual(approvedWhere.NOT,cambridgeTask);
  assert.equal(restrictedMaterial({origin:"CAMBRIDGE_EXAM",originManual:true,examArchivedAt:null}),true);
  assert.equal(restrictedMaterial({origin:"ORIGINAL",originManual:true,examArchivedAt:null,versions:[{examBoard:null,source:{name:"Cambridge International"}}]}),true);
  const v={source:"Cambridge International",examBoard:null,sourceUid:null,sourceReference:null,materialCategory:"UNKNOWN",syllabus:null,year:null,paper:null,examSession:null,questionNumber:null,titles:[]};
  assert.equal(classifyTask([v,{...v,source:"Maths4U Original"}]).origin,"CAMBRIDGE_EXAM");
});
