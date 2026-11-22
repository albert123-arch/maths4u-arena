import assert from "node:assert/strict";
import test from "node:test";
import { compareLearningCourses, courseLevels, levelHref } from "../src/lib/discovery-model";
import { parseGuestCourseChoice } from "../src/lib/guest-course-choice";

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
