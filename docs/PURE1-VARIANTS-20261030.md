# Fresh Pure 1 review variants — local stage

Scope: background work in the canonical PHP and Arena applications. No push,
commit, deployment, production writes or replacement of existing questions.

## Content added

Added **208 new English numeric questions**: one alternative for every original
short-check objective. All 50 skills have alternatives. The short bank now has
**416 questions** (350 numeric and 66 choice), organised into **208 objective
families**, with two questions in each family. Existing notes, 100 original
written problems, legacy banks and the separate guided Quadratics pilot remain.

The editorial file is `content/original/pure1-review-variants-v1.json`, identical
in both repositories. Its questions have fresh `M4U-P1-QP-VAR-…` UIDs, independent
canonical IDs, complete hints and worked solutions. Each has an explicit
`family_uid` pointing to the existing objective and a content version. The
original 208-question JSON file and its database projections were not rewritten.

New problems were prepared from Maths4U's own independently authored skill
briefs. They change mathematical data and the requested calculation; alternatives
to choice questions require a numeric answer rather than recollection of an
option position. Every new numeric answer differs from its corresponding old
numeric answer. Familiar methods and concepts are intentionally retained.
Preparation is AI-assisted; independent teacher editorial review is pending.

This is a finite, verified pool, not an unlimited live generator. More reviewed
variants can be added later without replacing the current questions.

## Rotation and learning evidence

When a family needs review, the selector first chooses a question the learner
has not checked, then the least recently checked question. Refreshing a page does
not randomly change that choice or create a result. Reading a page is not a check.
Unseen families are not labelled weak merely because new variants were added.

The schedule folds genuine check events across the same objective family. A
correct answer to the new variant can resolve the original objective's immediate
retry and schedule its next review. It does not change the original question's
answer, first mark or attempt. Early answers retain the existing interval rules;
changing question IDs does not manufacture a longer success streak.

PHP review mode displays the chosen variant for each due objective. Arena opens
the appropriate answer tab and highlights the selected canonical Task. This also
works when the original question was Multiple Choice and its fresh variant uses
Short Answer. Existing direct question links and normal practice remain available.

Account history is authoritative. PHP reads existing first attempts plus the
separate review-evidence table; no historical grades or rows were backfilled.
Arena still derives recommendations read-only from the learner's personal,
completed automatic practice, with current version, lesson and permission checks.
Teacher assignments, written self-study, Review and AiSuggestion retain their
existing roles and access rules.

PHP guest storage preserves the original UID/version entries and adds a separate
objective-family cache. Existing dated results initialise it without losing
their interval; undated correct flags do not gain an invented timestamp. Guest
and account evidence remain separate. No guest data becomes an account mark.

The shared JS policy handles variant selection and browser evidence migration;
server PHP and Arena fold chronological events for family schedules. A checked
answer still belongs to its own question, with its own numeric/fraction checker.
No user-supplied family ID or score controls scheduling.

## Canonical data and import

- PHP: 208 additive `questions` rows; no new options or schema changes. The
  existing fenced local short importer handles the combined original/variant
  catalogue, skips identical items and rejects conflicting stored projections.
- Arena: 208 new Tasks/immutable TaskVersion 1 records, explicit ImportRecord
  mappings and LessonTask links appended after existing items. No task/lesson
  revisions or schema changes. Repeat imports are checked against actual content.
- No runtime random question generation or expression evaluation was introduced.
  Arithmetic witnesses are offline authoring metadata, omitted from public DTOs.
- The new variant JSON and its two authoring/checking Python files are blocked
  from direct HTTP download. The private local router enforces those same three
  paths; the Apache rule was added locally for a later reviewed release. This
  does not restrict an existing bank route or old source-labelled material.

## Verification

- Arithmetic witnesses verify all 208 new answers. Independent finite-difference,
  integral, full-root-set and domain probes cover the new calculus/algebra/trig
  cases. Identity, family, objective mapping and changed-answer checks pass.
- PHP: **4,797** checker assertions cover all 416 canonical questions, equivalent
  numeric forms, wrong answers, malformed input and fail-closed source changes.
  Review tests pass **22** assertions. Existing answer checker, guided lessons
  and SEO tests pass.
- Seven Arena test groups pass, including every new canonical variant's grading,
  immutable/idempotent imports, no public answer/witness leakage, unseen/least-
  recent selection, transferred family success, unchanged original marks and
  existing original-block/diagram regressions.
- TypeScript, targeted ESLint, PHP syntax and whitespace checks pass.
- Headless QA passed 106 page views, visits all 50 skills on both sites at mobile width, renders all
  new solutions, checks a fresh question rejects the old answer, exercises PHP
  guest/account/cross-device recovery and Arena MC-to-numeric transfer, and
  checks desktop layouts and actor isolation. Only disposable test users and
  independent browser contexts are used; no foreground windows are controlled.
- Before/after proofs preserve all **8,128** existing PHP question/option rows
  and **25,161** Arena content/option rows, with all unrelated table checksums
  unchanged after fixture cleanup. This includes prior review history, marks,
  assignments, written problems and original lesson versions.

Private import mappings, exact-file checkpoints, preservation reports and
screenshots are in `club-import-work/pure1-variants-20261030` and Arena's
`.local/pure1-variants`. The latest 50-skill machine-readable coverage audit
records base checks, variants and objective families separately.

Next: independent teacher review of the question variants, then extend the
finite pool using actual misconceptions and difficulty observations. A larger
bank does not itself authorise retiring old material or publishing this stage.
