# Arena content review

## Scope

Inventory the package registry by syllabus, course, chapter and lesson. Reconcile the [November teaching audit](../ARENA-TEACHING-AUDIT-REPORT-20261122.md), [0580 follow-up](../ARENA-AUDIT-0580-REPORT-20261122.md) and source audits in the repository. The older Codex ZIP provides sampled findings A01–A24. Its sample counts do not establish all-course correctness.

## Baseline

- 140 packages cover 13 course registries and 699 lesson IDs. A separate Book 2 course appears in the live catalogue.
- All 8,825 authored checkpoints accepted the stored key and rejected malformed input. The 7,676 short and fresh bank variants passed with their expected response format. Three Normal distribution fields require 4 d.p. Their worked answers `0.7000`, `0.5000` and `0.0000` were accepted, and shorter decimals got the specific 4 d.p. instruction. The grading rule is appropriate.
- Rendered 208,567 fragments across 24,744 bank prompts, hints, answers, solutions and criteria. No KaTeX errors, empty support or missing referenced asset files were found. All 17,068 written rubrics sum to the stated marks. The separate Pure 1 cross-topic revision page returned HTTP 200.
- Re-ran 17 independent 9709 Pure 1 and Statistics 1 verifiers covering 4,642 assertions, and 25 independent 9231 verifiers reporting 26,210 assertions. Four 0580 verifiers reproduced 2,299 existing JSON and SVG outputs read-only and recalculated 222 worked examples and 438 study checks. Acceptance of a stored key tests compatibility; independent recomputation or editorial reading establishes the mathematics.

## Package inventory

| Course | Chapters | Lessons with theory | Checkpoints | Quick and fresh | Written bank |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0862 Stage 7 | 9 | 31 | 405 | 744 | 624 |
| 0862 Stage 8 | 10 | 24 | 342 | 576 | 560 |
| 0862 Stage 9 | 11 | 33 | 455 | 792 | 704 |
| 0580 IGCSE Mathematics | 38 | 231 | 2,813 | 2,310 | 4,628 |
| 0606 Additional Mathematics | 16 | 107 | 1,563 | 1,070 | 5,624 |
| 9709 Pure 1 | 9 | 45 | 563 | 360 | 1,800 |
| 9709 Pure 3 | 10 | 47 | 523 | 376 | 141 |
| 9709 Mechanics 1 | 5 | 25 | 275 | 200 | 75 |
| 9709 Statistics 1 | 8 | 40 | 494 | 320 | 1,600 |
| 9231 Further Pure 1 | 7 | 33 | 396 | 264 | 420 |
| 9231 Further Pure 2 | 6 | 35 | 420 | 280 | 434 |
| 9231 Further Mechanics | 6 | 24 | 288 | 192 | 241 |
| 9231 Further Statistics | 5 | 24 | 288 | 192 | 217 |

The package table excludes the separate cross-topic lesson and versioned Book 2 and olympiad catalogue entries. The sitemap includes only the publicly discoverable portion of that catalogue.

## Corrections verified on the isolated preview

| ID and affected lesson | Confirmed problem and impact | Correction and verification |
| --- | --- | --- |
| AQ-05a · [0580 Recurring decimals](https://arena.maths4u.sbs/courses/maths4u-0580/topics/igcse-0580-fdp-recurring) | A learner was told to choose a notation twice without a list of options. | Ask for the shortest repeating block directly. Show the exact bar placement and use `x` consistently in the subtraction table. |
| AQ-05b · [0606 Group choices](https://arena.maths4u.sbs/courses/maths4u-0606/topics/addmaths-0606-count-group-choices), [Reverse counts](https://arena.maths4u.sbs/courses/maths4u-0606/topics/addmaths-0606-count-reverse-counts) and [Infinite series](https://arena.maths4u.sbs/courses/maths4u-0606/topics/addmaths-0606-series-infinite-series) | Three exact duplicate prompts gave learners no new decision. A convergence example omitted its proposed ratios. | Introduce a compulsory choice, recover a group size from adjacent counts and compare partial sums of an alternating series. Include the convergence cases and explain each. |
| AQ-05c · [9231 FP2 Hyperbolic graphs](https://arena.maths4u.sbs/courses/maths4u-9231-fp2/topics/fp2_hyperbolic_graphs) | A question about the reciprocal hyperbolic curve asked learners to choose a statement without offering any. | Ask for the domain, range, maximum and asymptote. Derive all four using the positive reciprocal of cosh. |

All five corrected lessons and their A4 routes rendered at 390 and 1280 px. All seven edited worked examples expanded and displayed cleanly. An independent calculation checked the new steps and values. Lesson and example positions, existing questions, grading keys, checkpoints and revision sheets were preserved. Commit `2ae5d8cf`.

The follow-up wording scan confirmed two more incomplete prompts. The 9231 FP2 geometry lesson now asks for the tangent and derives `x = 1` from the vertical derivative vector through `(1, −2)`. In the 9709 P1 sequences lesson, E04 now presents the three AP, GP and proof parts with their marks. The AP solution is `x = 6` and the GP solutions are `x = −2` and `x = 8`. The last part asks for the proof directly and keeps the same two marks and criteria. Exact source comparisons and both viewport checks passed in `9bc27e10`. [9231 FP2 differentiation geometry](https://arena.maths4u.sbs/courses/maths4u-9231-fp2/topics/fp2_differentiation_geometry) · [9709 P1 sequences](https://arena.maths4u.sbs/courses/maths4u-9709-p1/topics/orig_series_trig_arithmetic)

## Book 2 · Advanced GCD Problems

The separate public catalogue has one lesson and 20 original written questions with English and Russian text. The audit found no Cambridge or unknown-origin tasks in that lesson.

- The proof for the sum of squares now rules out a second factor of two with a modulo-4 argument. The factorial example specifies positive integers because \(n=0\) gives a counterexample.
- P009 now uses a direct integer identity, valid at \(n=-2\). P017 works modulo a common divisor, so the argument also covers \(x+y=0\). P006, P010, P015 and P016 make the required domains explicit. Statements, hints and solutions retain their original marks and intent.
- Independent integer-model checks passed 12,258 assertions over all 20 problems and additional boundary cases. A guarded rehearsal appended one lesson version and six task versions. Before-and-after snapshots preserved all 21 original versions, four existing work-item references to old versions and two practice records. The correction script requires a current dry-run fingerprint and a loopback test database. An old fingerprint was refused and a fresh repeat did no writes.
- All six English and Russian landing, course and lesson routes passed at 390 and 1280 px. The guest catalogue retained all 20 original one-mark manual questions in both locales. All 80 gated hint and solution responses rendered, and the Cambridge catalogue filter was rejected for guests.

## Manual review still required

Sample solutions and diagrams with the highest instructional impact first. Prioritise conditions in proof and modelling, independent verification of each exemplar in new or substantially revised lessons and near-duplicate practice families. Existing byte-for-byte render checks establish that assets load. An editor still needs to judge whether each prompt supplies enough information and uses the appropriate diagram.

## Editorial standard

Use the [Arena lesson standard](../ARENA-LESSON-STANDARD.md) and the Cambridge syllabus for each course. Choose examples that make assumptions and restrictions visible. Give hints and original worked steps, then let an independently answered check drive Review. Keep equations in accessible mathematical markup and diagrams tied to the actual data. Preserve historical keys and immutable assignments when replacing any question.

Benchmark the way established resources connect a short topic explanation to worked examples and matching question sets. [Save My Exams Pure 1 topic notes](https://www.savemyexams.com/a-level/maths/cie/20/pure-1/revision-notes/)
