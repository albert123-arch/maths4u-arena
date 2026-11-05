# Original Coordinate Geometry — third local block

Preview:
<http://127.0.0.1:3103/courses/maths4u-9709-p1?chapter=orig_9709_p1_coordinate_geometry>.

Five English guides, 15 examples, ten new exam-style tasks, 30 parts, 80 suggested
marks and five original mathematical SVG diagrams. The canonical pack is the PHP
repository's `content/original/coordinate-geometry-v1.json`; its JSON and generated
SVGs are projected byte for byte into this application. Full report:
`D:/www/AS&A level maths/AS-Alevel/docs/coordinate-geometry-original-20261030.md`.

The third chapter and five new lessons sit alongside Quadratics and Functions in
the existing local Pure 1 course. Editorial UIDs `M4U-ORIG-COORD-001`–`010` map
to new Task identities via ImportRecord keys `maths4u / original:<UID>`. Original
tasks retain one immutable version each. MANUAL parts have answers and named
criteria, alternatives and mark limits; the suggested scheme is DRAFT Maths4U
guidance. AI-assisted preparation and pending independent teacher editorial review
are recorded. Existing source-labelled tasks and student history remain untouched.

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-block-local.ts coordinate-geometry
```

The generic importer remains local-only and registered-pack-only. Repeats skip ten
tasks without new versions. Conflicting content requires an explicit migration.
No schema migration, production mutation, deployment or push was performed.

The renderer now admits the five exact same-origin paths under
`/assets/original/coordinate-geometry/`, retaining private-file handling and
rejecting external URLs, unregistered paths, traversal, query strings and event
attributes. Arbitrary inline SVG is not enabled. The reviewed SVG files contain
no scripts/external references and use equal coordinate scales.

TypeScript, ESLint and three integration/rendering tests pass. The PHP math test
performs 2,546 coordinate/circle/SVG checks. Old content retains 22,751 row hashes,
including both previous original blocks; unrelated table checksums match. A separate
headless browser checked notes and question lists on both widths, every new diagram
and all 30 part prompts. No formula errors, page overflow or protected-help leaks
were found. All five diagrams were visually inspected. Evidence and local Task maps
are in `.local/original-coordinate-geometry/`.

The course now contains 15 original lessons and 30 original tasks across three
chapters. MANUAL paper study, assignment submission and teacher/AI grading
boundaries remain unchanged. No real-student AI calls or foreground UI control.
