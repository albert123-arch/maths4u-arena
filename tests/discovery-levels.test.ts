import assert from "node:assert/strict";
import test from "node:test";
import { compareLearningCourses, courseLevels, levelHref, searchDiscovery, type DiscoveryItem } from "../src/lib/discovery-model";
import { parseGuestCourseChoice } from "../src/lib/guest-course-choice";
import { isPublicLearningRoute, mayHaveRussianPage } from "../src/lib/public-presentation";

test("level picks preserve the stage and paper sequence and skip single-course directories", () => {
  assert.deepEqual(courseLevels.map(level => level.code), ["0862", "0580", "0606", "9709", "9231"]);
  const courses = ["maths4u-9709-s1", "maths4u-9709-m1", "maths4u-9709-p3", "maths4u-9709-p1"].map(slug => ({slug}));
  assert.deepEqual(courses.sort(compareLearningCourses).map(c => c.slug.slice(-2)), ["p1", "p3", "m1", "s1"]);
  assert.equal(levelHref("a-level", courses), "/learn/a-level");
  assert.equal(levelHref("igcse", [{slug:"maths4u-0580"}]), "/courses/maths4u-0580");
  assert.equal(levelHref("igcse", [{slug:"maths4u-0580"}, {slug:"maths4u-0580-core"}]), "/learn/igcse");
  assert.equal(levelHref("additional", []), "/learn/additional");
});

test("guest resume only restores same-course, same-origin lesson paths", () => {
  const base = {direction:"igcse", courseSlug:"maths4u-0580"};
  const valid = {...base, lessonHref:"/courses/maths4u-0580/topics/lesson", lessonTitle:"A sample lesson"};
  assert.deepEqual(parseGuestCourseChoice(JSON.stringify(valid)), valid);
  for (const lessonHref of ["https://example.com/courses/maths4u-0580/topics/lesson", "/courses/maths4u-0606/topics/lesson", "/admin", "/courses/maths4u-0580/topics/lesson?source=CAMBRIDGE"]) {
    assert.deepEqual(parseGuestCourseChoice(JSON.stringify({...valid, lessonHref})), base);
  }
  assert.deepEqual(parseGuestCourseChoice(JSON.stringify({...valid, direction:"additional"})), {direction:"additional"});
  assert.equal(parseGuestCourseChoice("invalid JSON"), null);
});

test("search ranks course codes, papers and lesson titles ahead of context-only matches", () => {
  const p1 = { title: "Pure Mathematics 1", courseSlug: "maths4u-9709-p1", direction: "a-level", kind: "course",
    ru: "", course: "", courseRu: "", chapter: "", chapterRu: "", href: "/courses/maths4u-9709-p1" } as const;
  const s1: DiscoveryItem = { ...p1, title: "Statistics 1", courseSlug: "maths4u-9709-s1", href: "/courses/maths4u-9709-s1" };
  const topic: DiscoveryItem = { ...s1, title: "Normal distribution", kind: "topic", href: `${s1.href}/topics/normal`, chapter: "Normal distribution" };
  const contextOnly: DiscoveryItem = { ...topic, title: "Approximating binomial probabilities", href: `${s1.href}/topics/approximation` };
  const items = [contextOnly, topic, s1, p1];
  assert.deepEqual(searchDiscovery(items, "9709").slice(0, 2), [p1, s1]);
  assert.equal(searchDiscovery(items, "9709 P1")[0], p1);
  assert.deepEqual(searchDiscovery(items, "normal distribution"), [topic, contextOnly]);
  assert.deepEqual(searchDiscovery(items, "?"), []);
});

test("public learning URLs accept only supported path shapes", () => {
  for (const path of [[], ["courses"], ["courses", "example"], ["courses", "example", "chapters", "geometry"],
    ["courses", "example", "topics", "angles"], ["learn", "olympiad"], ["library"], ["search"], ["for-teachers"]]) {
    assert.equal(isPublicLearningRoute(path), true, path.join("/"));
  }
  for (const path of [["library", "extra"], ["for-teachers", "extra"], ["search", "extra"], ["learn", "bad"], ["learn", "further", "extra"],
    ["courses", "example", "topics"], ["courses", "example", "topics", "angles", "extra"], ["courses", "example", "revision", "angles"]]) {
    assert.equal(isPublicLearningRoute(path), false, path.join("/"));
  }
});

test("directories and chapters skip translation lookup while courses, levels and lessons still consult the database", () => {
  for (const path of [["learn", "further"], ["courses", "example"], ["courses", "example", "topics", "angles"]]) {
    assert.equal(mayHaveRussianPage(path), true);
  }
  for (const path of [[], ["search"], ["library"], ["courses"], ["for-teachers"], ["courses", "example", "chapters", "geometry"]]) {
    assert.equal(mayHaveRussianPage(path), false);
  }
});
