import { contentPackageSchema } from "./content-package-schema";

/** A bank revision may update teaching data within existing question identities. */
export function reviseQuestionBank(source: unknown, revision: { version: string; questions: { id: string }[] }) {
  const previous = contentPackageSchema.parse(source);
  const changed = new Map(revision.questions.map(question => [question.id, question]));
  if (changed.size !== revision.questions.length || revision.version === previous.version) throw Error("BANK_REVISION_INVALID");
  const current = contentPackageSchema.parse({
    ...previous,
    version: revision.version,
    questions: previous.questions.map(q => changed.get(q.id) ?? q),
  });
  if ([...changed.keys()].some(uid => !previous.questions.some(q => q.id === uid))) throw Error("BANK_REVISION_UNKNOWN_QUESTION");
  for (const [index, before] of previous.questions.entries()) {
    const after = current.questions[index];
    if (!changed.has(before.id)) continue;
    const identity = (q: typeof before) => [q.id, q.family_uid, q.lesson, q.collection, q.variant_index, q.marks, q.difficulty, q.provenance,
      q.fields.map(field => [field.key, field.type]),
      q.parts.map(part => [part.label, part.marking_criteria.map(mark => [mark.code, mark.marks])])];
    if (JSON.stringify(identity(before)) !== JSON.stringify(identity(after))) throw Error("BANK_REVISION_IDENTITY_CHANGED: " + before.id);
    if (JSON.stringify(before) === JSON.stringify(after)) throw Error("BANK_REVISION_NO_CHANGE: " + before.id);
  }
  return { previous, current, changed };
}
