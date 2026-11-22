import assert from "node:assert/strict";
import test from "node:test";
import { catalogFilterHref, topicMode, topicModeHref } from "../src/lib/catalog-navigation";

const lesson = "/courses/maths4u-9709-p1/topics/orig_functions_composite";
const activity = { pathname: lesson, search: "?view=legacy&practice=previous&mode=MC&q=old&page=3&reviewTask=task_1", hash: "#practice" };

test("catalogue filters keep the lesson view, earlier practice, and review destination", () => {
  const url = new URL(catalogFilterHref(activity, { q: "composite functions", mode: "MC", page: "1" }), "https://arena.test");
  assert.equal(url.pathname, lesson);
  assert.equal(url.searchParams.get("view"), "legacy");
  assert.equal(url.searchParams.get("practice"), "previous");
  assert.equal(url.searchParams.get("q"), "composite functions");
  assert.equal(url.searchParams.get("reviewTask"), "task_1");
  assert.equal(url.hash, "#practice");
});

test("switching activity keeps the lesson view and removes the previous mode's page and pinned question", () => {
  for (const mode of ["MC", "SHORT", "WRITTEN", "NOTES"] as const) {
    const url = new URL(topicModeHref(activity, mode), "https://arena.test");
    assert.equal(topicMode(url.searchParams.get("mode")), mode);
    assert.equal(url.searchParams.get("view"), "legacy");
    assert.equal(url.searchParams.get("q"), "old");
    assert.equal(url.searchParams.has("page"), false);
    assert.equal(url.searchParams.has("reviewTask"), false);
    assert.equal(url.hash, "#practice");
  }
});
