import assert from "node:assert/strict";
import test from "node:test";
import { bankRevision } from "../src/lib/content-package-content";
import { packageFingerprint, packageTask } from "../src/lib/content-packages";
import { publicLearningTopic } from "../src/lib/public-learning-topic";
import { gradeSquare, squareQuestion } from "../src/lib/square-content";
import { readSquareDevice } from "../src/lib/square-device-progress";

const keys = ["0606-logarithms-exponentials", "0606-straight-line-graphs"];

for (const key of keys) {
  test(`${key} keeps the previous published bank available until the approved revision is applied`, async () => {
    const { previous, current, changed } = bankRevision(key)!;
    const lesson = previous.lessons[0];
    const installed = (p: typeof previous) => ({ state: "PUBLISHED", version: p.version, fingerprint: packageFingerprint(p) });
    const legacy = await publicLearningTopic(lesson.id, async () => installed(previous));
    assert.equal(legacy?.version, previous.version);
    const next = await publicLearningTopic(lesson.id, async () => installed(current));
    assert.equal(next?.version, current.version);
    assert.equal(await publicLearningTopic(lesson.id, async () => ({ ...installed(previous), fingerprint: "unrecognised" })), undefined);
    assert.equal(await publicLearningTopic(lesson.id, async () => ({ ...installed(current), state: "ARCHIVED" })), undefined);

    assert.ok(changed.size > 0);
    for (const [index, question] of previous.questions.entries()) {
      const projected = current.questions[index];
      assert.equal(projected.id, question.id);
      const before = packageTask(previous, question);
      const after = packageTask(current, projected);
      if (changed.has(question.id)) assert.notDeepEqual(after, before);
      else assert.deepEqual(after, before);
    }
  });

  test(`${key} retains the original guest answer and its content version across a bank update`, () => {
    const { previous, current } = bankRevision(key)!;
    const answer = (q: typeof previous.questions[number]) => Object.fromEntries(q.fields.map(f => [f.key, [f.expected].flat().join(";")]));
    const pair = previous.questions.flatMap((q, i) => {
      const revised = current.questions[i];
      return q.fields.length && JSON.stringify(answer(q)) !== JSON.stringify(answer(revised)) ? [[q, revised] as const] : [];
    }).find(([q, revised]) => {
      const lessonId = previous.lessons.find(l => l.key === q.lesson)!.id;
      return !gradeSquare(squareQuestion(revised.id, lessonId, current.version), answer(q)).correct;
    });
    assert.ok(pair);
    const [before, after] = pair;
    const lessonId = previous.lessons.find(l => l.key === before.lesson)!.id;
    assert.ok(gradeSquare(squareQuestion(before.id, lessonId, previous.version), answer(before)).correct);
    assert.ok(gradeSquare(squareQuestion(after.id, lessonId, current.version), answer(after)).correct);

    const event = { uid: before.id, answers: answer(before), eventKey: "saved", helpUsed: false, at: 123 };
    const result = { uid: before.id, family: before.family_uid, eventKey: event.eventKey, correct: true, helpUsed: false, at: event.at };
    const incoming = JSON.stringify({ version: previous.version, events: [{ ...event, result }] });
    const topic = { version: current.version, compatibleVersions: [previous.version], previousBankVersion: previous.version };
    const read = readSquareDevice(incoming, topic);
    assert.equal(read.version, current.version);
    assert.deepEqual(read.events[0], { ...event, result, contentVersion: previous.version });
    assert.deepEqual(readSquareDevice(JSON.stringify(read), topic), read);
  });
}
