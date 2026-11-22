# Arena audit and 0580 Number — 22 November 2026

## Corrections from the 183-lesson review

| Item | Local result |
| --- | --- |
| FP1 matrices | The study-check API accepts a bounded 12 fields. Both nine-entry inverse questions pass through the actual HTTP route. |
| Figures and question art | Corrected nine lesson diagrams, including the four with unintended black fill. Replaced the labelled headers in 161 question diagrams with neutral descriptions and kept the historical PNGs. |
| Formula display | Fixed the 12 identified raw-TeX errors. Reviewed coefficient, sign, radical and fraction presentation in the study copy and bank. The full bank scan covered 3,032 questions and 46,744 TeX segments. |
| Ranges and hyperbolic functions | Restored targeted feedback when a student includes the unattained upper endpoint. The Definitions sheet now shows all three hyperbolic definitions. |
| Pure 3 | Expanded 20 lessons in logarithms, trigonometry, differentiation and integration. Each has seven worked examples and 10–12 formative checks. Five Integration figures are new. |
| Mechanics and statistics precision | Accept exact forms or three significant figures in the relevant M1 and Further Mechanics practice fields. Exact-answer prompts and existing assignment scoring retain their precision rules. Further Statistics prompts specify rounding at the end and retain the existing four-place tolerance. Reviewed specific feedback remains available for recognised mistakes. |
| Duplicate questions | Replaced 19 formative exercises and seven examples while retaining the lesson IDs and practice-bank identities. |
| Roots link | The old chapter address permanently redirects to the new descriptive address. |

The offline grading pass accepted all 2,135 formative check keys in the original 183 lesson pages. Across those lessons and the new 0580 work, all 2,447 keys and 583 identified wrong-answer cases produced their expected results. The 20 revised P3 lessons passed mobile and desktop browser checks, representative guest submissions in every lesson, and one-page A4 printing.

## Isolated database rehearsal

The rehearsal ran on a separate loopback copy of the Arena database. Applied and republished 18 revised packages. Every repeat returned ALREADY_APPLIED. All 10,456 original task IDs, 10,587 historical task versions and 5,298 prior file signatures matched. The checksums for users, classes, assignments, answers, reviews, progress and presentation records matched.

## Cambridge IGCSE 0580

Six packages cover Number C/E1.1–C/E1.6. They contain 26 lessons, 162 worked examples, 312 formative checks, 260 short practice or fresh-review tasks and 520 written questions including alternate versions. Each lesson has an A4 sheet. The local import adds 780 task identities and leaves previously saved learning records intact.

Start with the [local 0580 course](http://127.0.0.1:3117/courses/maths4u-0580). The [source and syllabus map](ARENA-0580-COURSE-MAP-20261122.md) records the local Maths4U paper sample and first package references. See the per-chapter reviews for [Sets](ARENA-0580-SETS-SOURCES-20261122.md), [Powers and roots](ARENA-0580-POWERS-SOURCES-20261122.md), [Fractions, decimals and percentages](ARENA-0580-FDP-SOURCES-20261122.md), [Ordering](ARENA-0580-ORDERING-SOURCES-20261122.md) and [The four operations](ARENA-0580-OPERATIONS-SOURCES-20261122.md).

All 26 lessons passed checks at 390 px and 1280 px, including guest answer submission, a fresh option for review and one-page A4 printing. The scoped TypeScript check and 104 automated tests passed. Numeric practice and lesson checks accept mixed-number and supported currency notation; established marking criteria and answer values remain in force.

## Number extension through C/E1.11

Indices I, Standard form, Estimation, Limits of accuracy and Ratio and proportion are installed on the isolated test database. The five chapters add 20 lessons, 252 formative checks and 600 bank identities. All five imports return ALREADY_APPLIED on retry. Users, old exercise identities, answers, progress and presentation records are unchanged.

Each chapter has a source review: [Indices I](ARENA-0580-INDICES-I-SOURCES-20261122.md), [Standard form](ARENA-0580-STANDARD-FORM-SOURCES-20261122.md), [Estimation](ARENA-0580-ESTIMATION-SOURCES-20261122.md), [Limits of accuracy](ARENA-0580-BOUNDS-SOURCES-20261122.md) and [Ratio and proportion](ARENA-0580-RATIO-SOURCES-20261122.md). Compared all 20 lessons on mobile and desktop and generated one-page print proofs. Repeated the preview checks that encountered a development-server restart.

## Number extension through C/E1.15

Rates, Percentages, Using a calculator and Time add 18 lessons, 108 worked examples, 216 formative checks and 540 new short and written task identities on the isolated database. Every apply was repeated with ALREADY_APPLIED and identical existing user, answer, review and presentation counts. All 248 Time answer keys for the formative and short tasks and written parts were recomputed from the questions. The practice and note inputs accept the usual 24-hour notation and percentage signs.

Chapter references are in [Rates](ARENA-0580-RATES-SOURCES-20261122.md), [Percentages](ARENA-0580-PERCENTAGES-SOURCES-20261122.md), [Using a calculator](ARENA-0580-CALCULATOR-SOURCES-20261122.md) and [Time](ARENA-0580-TIME-SOURCES-20261122.md). The updated Roots digest test still binds the original audited grades and choices. It checks the single correction from a coefficient of 1 to standard notation without changing the mathematics.

## Completed Number and first Algebra chapter

Money, Exponential growth and decay, and Surds complete all 18 Number objectives for Core and Extended. Number has 77 lessons, 2,310 bank task identities with fresh variants and one A4 sheet per lesson. Introduction to algebra adds three lessons and 90 task identities. The four manifests were published on the isolated test database and returned ALREADY_APPLIED on retry. Core and Extended scope and teaching references are recorded in [Money](ARENA-0580-MONEY-SOURCES-20261122.md), [Growth and decay](ARENA-0580-EXPONENTIAL-GROWTH-DECAY-SOURCES-20261122.md), [Surds](ARENA-0580-SURDS-SOURCES-20261122.md) and [Introduction to algebra](ARENA-0580-INTRODUCTION-TO-ALGEBRA-SOURCES-20261122.md).

## Algebra through C/E2.5

Algebraic manipulation, Algebraic fractions, Indices II, and Equations and formulae add 25 lessons and 750 bank identities. All four packages are installed on the isolated database, and each repeat is ALREADY_APPLIED. Their authoring reviews cover [manipulation](ARENA-0580-ALGEBRAIC-MANIPULATION-SOURCES-20261122.md), [algebraic fractions](ARENA-0580-ALGEBRAIC-FRACTIONS-SOURCES-20261122.md), [Indices II](ARENA-0580-INDICES-II-SOURCES-20261122.md) and [Equations and formulae](ARENA-0580-EQUATIONS-SOURCES-20261122.md).

The Equations package independently rechecked 180 short and formative keys and 320 written parts. Rendered checks and question fragments had no KaTeX errors. The scoped 0580 checker accepts a rearranged formula with the requested subject before the equals sign. A different subject or a square in place of the requested variable is rejected.

## Inequalities, sequences, proportion and graphs

Five further packages add 29 lessons and 870 practice, review and written task identities. The [Inequalities](ARENA-0580-INEQUALITIES-SOURCES-20261122.md), [Sequences](ARENA-0580-SEQUENCES-SOURCES-20261122.md), [Proportion](ARENA-0580-ALGEBRA-PROPORTION-SOURCES-20261122.md), [Practical graphs](ARENA-0580-PRACTICAL-GRAPHS-SOURCES-20261122.md) and [Sketching curves](ARENA-0580-SKETCHING-SOURCES-20261122.md) notes record their sources and checks. The isolated database accepted each package once and reported ALREADY_APPLIED on the second run.

Study sections can begin directly with a key idea. Lessons of this form render normally. Ratio and set misconceptions are compared in the student's usual mathematical notation and return the specific feedback attached to each error. The integrated renderer and grader passed all 3,767 keys and all 1,446 registered wrong-answer feedback cases across 317 lessons at this point.

## Completed Algebra and Coordinate geometry

Graphs of functions, Differentiation, Functions and Coordinate geometry add 26 lessons and 780 task identities. All four packages were published on the isolated database and returned ALREADY_APPLIED on repeat. The course now contains 160 lessons and 4,800 task identities. The integrated renderer and grader passed 4,083 answer keys and all 1,570 recorded misconception checks across 343 audited and new lessons. The Coordinate geometry keys were also recalculated independently, including diagram positions and written parts.

Teaching and verification references are in [Graphs of functions](ARENA-0580-GRAPHS-OF-FUNCTIONS-SOURCES-20261122.md), [Differentiation](ARENA-0580-DIFFERENTIATION-SOURCES-20261122.md), [Functions](ARENA-0580-FUNCTIONS-SOURCES-20261122.md) and [Coordinate geometry](ARENA-0580-COORDINATE-GEOMETRY-SOURCES-20261122.md).

## Mensuration

Published the complete 11-lesson [Mensuration chapter](ARENA-0580-MENSURATION-SOURCES-20261122.md) to the isolated database, including 330 new task identities. A repeated import returned ALREADY_APPLIED. The grader accepted all 242 bank and lesson inputs, rejected separate wrong inputs, and returned the intended feedback for all 132 stored mistakes. Independently recalculated 748 equalities across checks, worked examples and written solutions. Validated all 3,003 markup fragments checked from the manifest and study file.

## Trigonometry

Published ten [Trigonometry lessons](ARENA-0580-TRIGONOMETRY-SOURCES-20261122.md) to the isolated test database. The 300 task identities were created once. The chapter includes 60 worked examples and 122 formative checks. Its independent review recomputed 678 answer and solution parts and reconciled 828 written marks. All ten revision sheets printed as one A4 page with the course print CSS. Across the integrated audited and new material, 4,337 expected answers and 1,702 specific error-feedback cases passed.

## Transformations and vectors

The ten [Transformations and vectors lessons](ARENA-0580-TRANSFORMATIONS-VECTORS-SOURCES-20261122.md) add 300 task identities and 120 formative checks. The bank and its 426 diagram placements passed schema and file-hash validation. The independent review computed 760 results and checked all 437 SVGs. All ten A4 sheets fit on one page. The isolated import created the expected rows and returned ALREADY_APPLIED on retry.

The Number Types question bank now rotates the correct option in fresh multiple-choice variants. All 150 identities are preserved, including the historical versions with their original option order.

## Geometry and follow-up syllabus checks

The [Geometry chapter](ARENA-0580-GEOMETRY-SOURCES-20261122.md) adds 15 lessons and 450 task identities, with Core constructions and Extended circle theorems. Its independent check recomputed 972 results, tested 36 compass constructions and checked all 15 A4 sheets. The final review enriched polygon and congruence practice and introduced different nets for previously repeated prompts. Published both Geometry versions on the isolated database, preserving all 450 identities.

The full-syllabus pass added general-form lines, perpendicular bisectors, metric power conversions, polygon perimeters, the surface area of triangular prisms and number names. The revised Coordinate geometry, Mensuration and Number Types packages add four lessons and 124 task identities. All previous identities were preserved and repeat imports returned ALREADY_APPLIED. Mensuration calculations were rechecked as 887 exact equalities.

The independent comparison with the input SQL export matched all 16,420 checked historical rows by SHA-256, including 535 user and learning records and 15,885 task-version and stored-file records. File comparisons cover database metadata.

## Statistics

The twelve [Statistics lessons](ARENA-0580-STATISTICS-SOURCES-20261122.md) add 360 practice and written task identities on the isolated database. The chapter uses labelled SVG graphs and HTML tables for data and stem-and-leaf diagrams. Independent checks covered 794 calculated values and 880 written marks. The renderer and grader passed all 146 formative checks. The repeat import returned ALREADY_APPLIED.

## Probability

The nine [Probability lessons](ARENA-0580-PROBABILITY-SOURCES-20261122.md) add 270 task identities and 108 formative checks. Paper and screen practice covers single events, observed probabilities, sample spaces, Venn diagrams, replacement and removal trees, and conditional probability. The independent review recalculated 524 results and checked 272 marking criteria and 45 fresh review links. The import and repeat passed on the isolated database.

## Integrated 0580 checks

All nine syllabus areas are present in 38 chapters with 231 lessons and 231 revision sheets. The bank has 1,155 short tasks, 1,155 fresh short variants and 4,628 written tasks, including variants. Every bank record was validated with correct mark totals. All 2,564 expected bank input fields passed and the corresponding wrong inputs were rejected. The final scan checked 32,230 distinct HTML and KaTeX fragments, 909 public SVGs referenced by the bank and 756 protected diagram placements.

Across the 183 audited lessons and 231 new 0580 lessons, all 4,948 formative keys and 2,127 specific feedback cases passed. The final full-row comparison after all imports matched the same 16,420 baseline rows against the isolated SQL export. It includes 10,587 historical task versions and 59 presentation records. All 6,938 new task identities were added once.

The route check uncovered a package lifecycle error. New tasks in an applied revision of an already published package started as private, while the publication action was already complete. New tasks now inherit the package publication state in the apply transaction. Existing tasks retain their visibility. On the isolated rehearsal database, reconciled precisely 124 new task identities by comparing the previous and current release receipts. A subsequent Mensuration 1.2.0 update through the regular importer added four public variants, preserved all 390 prior identities and their visibility, and returned ALREADY_APPLIED without extra rows on repeat. All 895 Mensuration calculations were rechecked.

## Final local acceptance

The Webpack production-style build and TypeScript check passed using the isolated test configuration. Checked all 38 chapter routes, 231 lesson routes and 231 A4 revision routes, including the 269 chapter and lesson URLs in the local sitemap and three guest API calls per chapter. The final Mensuration version passed its 13 lesson and A4 routes again. All four newly imported written variants opened for a guest with their solution, correct marking total and rendered mathematics.

Playwright verified 53 representative lesson flows across all 38 chapters at 390 px and 1280 px. These checks included answer submission, a deliberate mistake, a fresh review variant, persistence of the guest draft, written solutions and marking guidance, and one-page A4 output. All 53 flows passed after repeating the affected cases with selectors that wait for the active input and target visible illustrations. The preview remains available at [Cambridge IGCSE 0580](http://127.0.0.1:3117/courses/maths4u-0580).

The 49 focused unit tests passed. The rebuilt preview passed the audit's HTTP smoke checks, including both nine-field matrix answers and the Mechanics and Further Statistics precision cases. Further checks confirmed the two specific Ranges explanations, the Roots redirect and inclusion of all three hyperbolic definitions. The final preservation comparison matched 16,420 of 16,420 historical rows in 21 tables after the new version and repeat import.

No push, deploy or production database writes were made.
