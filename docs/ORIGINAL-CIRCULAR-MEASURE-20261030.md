# Original Circular Measure — fourth local block

Preview:
<http://127.0.0.1:3103/courses/maths4u-9709-p1?chapter=orig_9709_p1_circular_measure>.

Five English guides, 15 examples, ten new exam-style tasks, 30 parts, 71 suggested
marks and six original diagrams. The canonical PHP source is
`content/original/circular-measure-v1.json`; its JSON and generated SVGs are
projected byte for byte here. Full report:
`D:/www/AS&A level maths/AS-Alevel/docs/circular-measure-original-20261030.md`.

The PHP site reuses three existing topics (52, 53, 55) for five finer skills.
Arena creates five lessons in a fourth original chapter inside the existing local
Pure 1 course. Editorial UIDs `M4U-ORIG-CIRC-001`–`010` map to new Task identities
through ImportRecord keys `maths4u / original:<UID>`. Existing imported and original
tasks/versions/history remain unchanged. MANUAL parts have answers, criteria,
alternatives and mark limits; suggested marking text is DRAFT Maths4U guidance.
AI-assisted preparation and pending independent teacher editorial review are explicit.

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-block-local.ts circular-measure
```

The importer is registered-pack-only and local-only. Repeats skip ten tasks;
conflicting content requires explicit version migration. No schema or submission/
grading workflow changed. No production writes, deployment, push or AI calls.

The HTML renderer admits the six exact SVG paths under
`/assets/original/circular-measure/`, retaining the earlier five diagram paths and
private-file handling. External/unknown/traversal/query-string paths and event
attributes are rejected. Arbitrary inline SVG is not enabled. Reviewed SVGs contain
no scripts or external references.

TypeScript, ESLint and three integration/rendering tests pass. PHP math checks
cover the examples, tasks, radius/angle geometry and boundary exceptions (1,171
checks). Existing Arena content retains 22,888 individual row hashes and unrelated
table checksums. The original course has 20 lessons and 40 tasks across four chapters.
Headless browser checks cover both widths, all new question lists and diagrams,
without missing prompts, overflow, formula errors or protected-help leaks. All six
diagrams were visually inspected. Evidence/maps: `.local/original-circular-measure/`.

Existing MANUAL paper study, assignment submission, teacher review and AI-proposal
boundaries remain intact. No foreground windows or owner browser tabs were used.
