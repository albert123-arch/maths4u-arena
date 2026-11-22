# Arena content review

## Scope

Inventory the package registry by syllabus, course, chapter and lesson. Reconcile the [November teaching audit](../ARENA-TEACHING-AUDIT-REPORT-20261122.md), [0580 follow-up](../ARENA-AUDIT-0580-REPORT-20261122.md) and source audits in the repository. The older Codex ZIP provides sampled findings A01–A24. Its sample counts do not establish all-course correctness.

## Baseline

- 140 packages cover 13 course registries and 699 lesson IDs. A separate Book 2 course appears in the live catalogue.
- 8,825 authored checkpoints were tested with the stored key and malformed input. The key passed in all cases and every malformed input was rejected. In the bank, 7,673 of 7,676 literal stored values passed initially. The remaining fields are in Normal distribution and specify four decimal places. Verify the projected task and the public worked answer before changing grading.
- The rendered study scan found no KaTeX errors or missing referenced assets. It flagged three exact duplicate worked-example prompts in 0606 and a separately implemented Pure 1 cross-topic link for follow-up.
- Existing independent Pure 1 and Statistics 1 mathematical verifiers passed all 17 suites. An accepted stored key alone tests compatibility; independent recomputation or editorial reading is needed to establish the mathematics.

## Editorial standard

Use the [Arena lesson standard](../ARENA-LESSON-STANDARD.md) and the Cambridge syllabus for each course. Choose examples that make assumptions and restrictions visible. Give hints and original worked steps, then let an independently answered check drive Review. Keep equations in accessible mathematical markup and diagrams tied to the actual data. Preserve historical keys and immutable assignments when replacing any question.

Benchmark the way established resources connect a short topic explanation to worked examples and matching question sets. [Save My Exams Pure 1 topic notes](https://www.savemyexams.com/a-level/maths/cie/20/pure-1/revision-notes/)
