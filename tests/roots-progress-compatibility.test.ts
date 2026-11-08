import test from "node:test";
import assert from "node:assert/strict";
import { contentPackage, packageTopic } from "../src/lib/content-package-content";
import { notationProgressPolicy } from "../src/lib/content-progress-policy";
import { firstStoredValue, readSquareDevice } from "../src/lib/square-device-progress";
import { squareSnapshot } from "../src/lib/square-model";

test("only the complete approved Roots notation revision retains prior evidence", () => {
  const p = contentPackage("9231-fp1-roots");
  assert.equal(p.version, "1.0.1");
  assert.equal(notationProgressPolicy(p).length, 1);
  assert.deepEqual(packageTopic(p.lessons[0].id)!.compatibleVersions, ["1.0.0"]);
  for (const mutate of [
    (v: typeof p) => { v.questions[0].fields[0].expected = "999"; },
    (v: typeof p) => { v.questions[0].prompt_html += "<p>A different question.</p>"; },
    (v: typeof p) => { v.questions[0].family_uid += "-other"; },
    (v: typeof p) => { v.questions[0].marks++; },
    (v: typeof p) => { v.version = "1.0.2"; },
    (v: typeof p) => { v.version = "1.0.0"; },
    (v: typeof p) => { v.key = "9231-fp1-other"; },
  ]) { const changed = structuredClone(p); mutate(changed); assert.deepEqual(notationProgressPolicy(changed), []); }
});

test("compatible guest checks keep chronology, mastery and ownership markers without rewriting storage", () => {
  const topic = { version: "1.0.1", compatibleVersions: ["1.0.0"] };
  const events = [0, 1].map(i => ({ eventKey: "saved-" + i, uid: "q" + i, answers: { all: "7" }, helpUsed: false, at: (i + 1) * 86400000,
    claimedBy: "original-account", result: { eventKey: "saved-" + i, uid: "q" + i, family: "same-skill", correct: true, helpUsed: false, at: (i + 1) * 86400000 } }));
  const original = JSON.stringify({ version: "1.0.0", events });
  const result = readSquareDevice(original, topic);
  assert.equal(result.version, "1.0.1");
  assert.deepEqual(result.events, events);
  assert.deepEqual(squareSnapshot(result.events.map(e => e.result)), squareSnapshot(events.map(e => e.result)));
  assert.equal(JSON.parse(original).version, "1.0.0");
  assert.throws(() => readSquareDevice(original, { version: "1.0.1" }), /not been replaced/);
  assert.throws(() => readSquareDevice(JSON.stringify({ version: "9.0.0", events }), topic), /not been replaced/);
  assert.throws(() => readSquareDevice('{"version":"1.0.0","events":[null]}', topic));
});

test("resume, answers and support drafts prefer current values and retain the original fallback", () => {
  const values = new Map([["old-resume", "q2"], ["old-draft", '{"answers":{"x":"3/2"},"helpUsed":true}'], ["old-support", '{"access":"paper","marks":{"a":2},"points":2}']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null }, before = [...values];
  for (const suffix of ["resume", "draft", "support"]) assert.equal(firstStoredValue(storage, ["new-" + suffix, "old-" + suffix]), values.get("old-" + suffix));
  assert.deepEqual([...values], before);
  values.set("new-resume", "q3");
  assert.equal(firstStoredValue(storage, ["new-resume", "old-resume"]), "q3");
  assert.equal(values.get("old-resume"), "q2");
});
