# Pure 1 skill coverage and short practice — local implementation

Owner scope: background work in the two canonical applications; no push,
deployment or production writes. Existing banks and user data remain available.

## Audit result

The ten current original study blocks contain 50 skill briefs, 50 guides,
150 examples and 100 written exam-style problems. Before this change, none
of their Arena lessons had automatic short checks. PHP already had a separate
five-skill Quadratics guided pilot with 48 activities; its provenance and IDs
have not been relabelled. Existing topic banks also contain legacy questions,
but their presence alone does not establish reviewed coverage for a skill.

Added **208 independently prepared English short questions**: **142 numeric**
and **66 single-choice**, with **4–6 checks per skill**. Every question has a
hint, answer, worked explanation, a stable editorial UID and review status.
The shared editorial file is `content/original/pure1-short-practice-v1.json`.
It is identical in both applications; it is not a competing runtime database.

The comparison used the official [9709 syllabus for 2026–2027, version 4,
pages 19–22](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf).
Its eight Pure 1 sections map to our existing blocks: Quadratics, Functions,
Coordinate Geometry, Circular Measure, Trigonometry, Series (including
Binomial Expansion), Differentiation and Integration. Cross-Topic Revision
combines these skills. This is an editorial mapping, not board endorsement.

Four starter checks were authored for each brief. Eight extra checks address
specific omissions found during comparison: the quadratic formula; a range
with an unattained bound; principal inverse cosine and inverse tangent;
a linear sine/cosine equation; factorial notation; the semicircle property;
and integration of a negative power with a linear inner expression.

Other deliberate boundary coverage includes excluded denominators, quartic
and square-root substitutions, inverse branches, composite domains, vertical
lines, major/minor circular regions, all trigonometric roots on an interval,
GP convergence endpoints, chain rule, inconclusive second-derivative tests,
optimisation endpoints, improper integration, signed/geometric areas, washers,
revolution about either axis, and total versus net accumulation.

The complete **50-row audit**, per-skill counts, focus labels, UIDs and routes
is in `docs/pure1-skill-coverage-20261030.json`. Legacy question counts can be
shared by more than one brief because several skills map to one PHP topic;
they must not be summed as distinct legacy items.

## Where to use it

- PHP: `/original_practice.php` is the 50-skill index. Every original guide
  and associated topic page links to the matching short practice.
- Arena: `/courses/maths4u-9709-p1` retains its ten chapters and 50 lessons.
  Each lesson now has Multiple Choice / Short Answer tabs where applicable,
  alongside its unchanged two Written / Exam questions.
- All original material is English. Existing lesson versions are unchanged.

## Canonical data, checking and progress

PHP short questions use `questions` and `question_options`, with exact
`questions.info` mapping to the reserved `M4U-P1-QP-…` UID. The new local importer
adds published English rows, refuses conflicting projections and skips identical
imports. Long questions remain in `problems`. There are no schema changes.

The server checks the canonical row against its editorial projection before
using a key. It accepts one bounded number/fraction or one available option.
The new short API uses existing CSRF, origin, request-size and rate guards.
Hints are available immediately; solutions require a checked answer in the
session or an existing account attempt. No answer keys are embedded in the new
practice page. The existing general practice API uses the same precise checker
only for these new UIDs; its legacy grading path remains intact.

Guest latest results are stored locally by UID, content version and guest scope.
Logged-in results reuse the existing first-attempt recorder. A retry displays
its latest result while retaining the account's first result. Guest history is
not silently merged into account marks.

Arena uses new public TRAINING Tasks, immutable TaskVersion 1 records and
ImportRecord mappings (`short-practice:<UID>`). LessonTask links append the
checks after each lesson's two existing written tasks. No source task, written
task version or lesson version was overwritten. Import repeats verify the
actual stored projection, not just its import hash.

Arena numeric checking accepts fractions only for the reserved new UID family;
legacy NUMERIC questions retain decimal grading. The bounded parser evaluates
neither algebraic expressions nor code. Absolute tolerance is 0.000001;
instructions request a fraction or decimals to at least six places. A new
non-answer format flag enables fraction entry on the corresponding inputs.
Student responses and deterministic autoPoints retain their existing storage;
teacher Review and AiSuggestion are not populated by short checking. Existing
MANUAL paper self-study still cannot submit fabricated written grades.

## Verification

- PHP: 2,301 new assertions cover all 208 canonical projections, every choice,
  correct/wrong numeric values, equivalent fractions/decimals, malformed input
  and a rolled-back mutation that must fail closed.
- Independent math oracles cover all 142 numeric answers; reviewed choice
  expectations cover 66 items. Additional tests check full root sets and domain,
  convergence, derivative and improper-integral boundaries. This is automated
  checking with AI-assisted editorial review, not independent teacher approval.
- Existing PHP checks passed: answer checker 48; skill lesson 64; guided pilot
  277 assertions / 48 activities; SEO 30.
- Arena tests verify repeat imports, all options/answers, hidden answer keys,
  per-lesson counts, immutable versions, changed-content refusal and the local
  DB fence. Existing original-block and diagram tests pass.
- TypeScript and targeted ESLint pass. Both repositories pass diff whitespace
  checks; unrelated owner changes are preserved.
- Background browser QA passed 151 page views, including all 50 skill pages and corresponding Arena answer
  tabs, all worked-solution formulae, mobile/desktop layouts, wrong/right checks,
  equivalent fractions, reload persistence and request/access boundaries.
  An authenticated Arena bookmark button overflowed the narrow utility column;
  mobile bookmark actions now occupy their own row. The checked result page has
  viewport width 390 and document width 390, with no overflowing elements.
- PHP authenticated HTTP QA verifies that a wrong first answer survives a
  subsequent correct answer and reload, including the generic API's precision.
  Test attempts are removed only for the explicit synthetic fixture.
- Before/after database proofs retain 7,656 old PHP question/option row hashes
  and 22,969 old Arena content/option rows, with unchanged checksums for other
  tables after fixture cleanup. In particular all old `problems`, attempts,
  assignments and original lesson versions remain unchanged.

Private QA reports/screenshots and import mappings are outside Git, in
`club-import-work/pure1-short-practice-20261030` and Arena's
`.local/pure1-short-practice`. Local import commands are deliberately fenced;
they do not read a production connection or provide an HTTP import endpoint.

## Readiness and next work

All 50 briefs now have starter short checks. Four to six items are not an
exhaustive question bank or a mastery measure. Selecting a graph/identity or
entering a numeric value does not assess the ability to draw a graph, prove an
identity or communicate a complete argument; use the written problems for that.
Independent teacher editorial review is **pending**, including suitability,
distractor quality and practical lesson use. Next: complete that review, then
expand variants based on actual error patterns and plan revision scheduling.
No old-bank retirement, AI grading or publication is authorized by this stage.
