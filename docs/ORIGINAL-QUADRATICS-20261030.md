# Original Quadratics: local pilot

The owner requested this first original block on both Maths4U sites, locally and
without push. Existing tasks, versions, sources, lessons, attempts and reviews
remain unchanged.

The shared editorial pack is `content/original/quadratics-v1.json`: five notes,
15 worked examples, ten independently prepared English exam-style problems,
30 parts and 74 suggested marks. Its canonical authoring source and full
implementation/verification report are in the PHP repository:
`D:/www/AS&A level maths/AS-Alevel/docs/quadratics-original-20261030.md`.
Synchronise the small JSON projection after an explicit editorial revision;
do not independently edit two banks or reuse a legacy task's identity.

Local preview: <http://127.0.0.1:3103/courses/maths4u-9709-p1>.
Course → Quadratics → five skill lessons; the `Written / Exam questions` tab
contains two new tasks per lesson. Notes and examples are available on the
ordinary lesson pages. Original questions have independent per-part prompts in
the catalogue; existing imported questions retain their current display.

`src/lib/original-quadratics.ts` validates the pack and imports it atomically
through the existing Task/TaskVersion model. New editorial codes
`M4U-ORIG-QUAD-001` through `010` map through ImportRecord keys
`maths4u / original:<code>`. Per-part answers and uniquely identified criteria
are present, with alternative methods and mark limits. Suggested marking text
is DRAFT Maths4U guidance, not an official scheme. AI-assisted preparation and
pending independent teacher editorial review are recorded explicitly.

Local-only command (canonical Arena directory):

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-quadratics-local.ts
```

The wrapper uses the existing isolated bank fixture. The importer additionally
rejects production or non-loopback targets, ID collisions and changed original
content. Repeat imports skip all ten tasks without creating versions or changing
existing task content. A future revision needs an explicit version migration.
Do not turn this local script into a production route without a separate review.

Validation: TypeScript and ESLint pass; `tests/original-quadratics.test.ts` checks
identity, mark totals, protected-help boundaries, repeat imports and rejection
paths. The PHP mathematical test independently checks all examples/problem
parts (1,612 assertions). The preserved legacy subset has the same pre-import
checksums for 22,496 content rows; unrelated tables are unchanged. An isolated
headless browser checked both widths and all five new question lists, including
the 30 part prompts, without controlling the owner's desktop. Evidence and local
Task mappings are in `.local/original-quadratics/`.

MANUAL paper self-study, assignment submission, teacher grading and AI-proposal
boundaries are unchanged. No production writes, AI grading, deployment or push
were performed.
