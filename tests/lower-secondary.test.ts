import assert from "node:assert/strict";
import test from "node:test";
import { contentPackage, packageTeaching, packageTopic, publicChapterPath } from "../src/lib/content-package-content";
import { packageTask } from "../src/lib/content-packages";
import { renderContent } from "../src/lib/content";
import { checkExact } from "../src/lib/exact-answer";
import { igcseNumberInput } from "../src/lib/igcse-number-input";
import { gradeSquare, squareQuestion } from "../src/lib/square-content";
import { answerFormat } from "../src/lib/square-presentation";
import { automaticPoints } from "../src/lib/works";

test("0862 stages use separate school routes and can import twelve practice pairs per lesson", () => {
  for (const stage of [7, 8, 9]) {
    const pack = contentPackage(`0862-s${stage}-mathematical-thinking`);
    assert.equal(publicChapterPath(pack), `/courses/maths4u-0862-stage-${stage}/chapters/mathematical-thinking`);
    const lesson = pack.lessons[0];
    const teaching = packageTeaching(packageTopic(lesson.id)!);
    assert.equal(teaching?.navigation.directionPath, "/learn/school");
    assert.equal(teaching?.navigation.directionTitle, "School Mathematics");
    const practice = pack.questions.filter(q => q.collection === "short");
    assert.equal(practice.length, 12);
    for (const q of practice) {
      assert(pack.questions.some(fresh => fresh.collection === "variant" && fresh.family_uid === q.family_uid && fresh.prompt_html !== q.prompt_html));
      assert.equal(packageTask(pack, q).syllabus, "0862");
    }
  }
});

test("authorised 0862 diagrams survive the content renderer", () => {
  const allowed = "/assets/study/0862/stage-7/signed-moves.svg";
  const other = "/assets/study/0862/stage-6/signed-moves.svg";
  assert(renderContent(`<img src="${allowed}" alt="Number line">`, true).includes(allowed));
  assert(!renderContent(`<img src="${other}" alt="Number line">`, true).includes(other));
});

test("0862 practice accepts an equivalent mixed number", () => {
  const pack = contentPackage("0862-s9-mathematical-thinking");
  const question = pack.questions.find(q => q.collection === "short" && q.title === "Combining two groups fairly" &&
    q.fields[0]?.type === "number" && /^\d+\/\d+$/.test(String(q.fields[0]?.expected)))!;
  const [numerator, denominator] = String(question.fields[0].expected).split("/").map(Number);
  const mixed = `${Math.floor(numerator / denominator)} ${numerator % denominator}/${denominator}`;
  const task = squareQuestion(question.id, pack.lessons[0].id);
  assert(gradeSquare(task, { answer: mixed }).correct);
  assert(!gradeSquare(task, { answer: `${Math.floor(numerator / denominator) + 1} ${numerator % denominator}/${denominator}` }).correct);
  const native = packageTask(pack, question).parts[0];
  const saved = { ...native, acceptedAnswers: native.acceptedAnswers.map(value => ({ value })) } as unknown as Parameters<typeof automaticPoints>[0];
  assert.equal(automaticPoints(saved, { value: mixed }, question.id), native.maxPoints);
});

test("classroom ratio fields give colon guidance and preserve part order", () => {
  const field = { key: "ratio", label: "Blue to white ratio", type: "ratio", expected: "2;3" };
  assert.equal(answerFormat(field).placeholder, "2:3");
  assert(checkExact(field, igcseNumberInput(field, "2 : 3")));
  assert(!checkExact(field, igcseNumberInput(field, "3 : 2")));
});
