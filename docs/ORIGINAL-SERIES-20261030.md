# Original Series — sixth local block

Preview:
<http://127.0.0.1:3103/courses/maths4u-9709-p1?chapter=orig_9709_p1_series>.

Five English guides, 15 examples, ten new exam-style tasks, 30 parts, 75
indicative marks and six original diagrams. Canonical PHP JSON:
`D:/www/AS&A level maths/AS-Alevel/content/original/series-v1.json`, projected
byte for byte with its SVGs. Full report:
`D:/www/AS&A level maths/AS-Alevel/docs/series-original-20261030.md`.

The sixth chapter and five lessons sit in the existing original Pure 1 course.
The guides cover arithmetic/geometric progressions, both trigonometric
progression topics and applications. Editorial UIDs `M4U-ORIG-SER-001`–`010`
map through ImportRecord keys `maths4u / original:<UID>` to ten new Task
identities with one immutable version each and three MANUAL parts. Answers,
solutions, named criteria, alternatives and mark limits are stored. Marking
guidance is DRAFT; AI-assisted preparation and pending independent teacher
editorial review are explicit. No official question or mark scheme was copied.

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-block-local.ts series
```

Imports remain additive, registered-pack-only and fenced to the isolated local
test DB. A second run skips all ten tasks without new versions. Existing
payload/mapping changes still require explicit version migration. The renderer
admits six exact new SVG paths, retaining prior allowlists and private-file
permissions. Unsafe/unknown paths and event attributes remain rejected.

TypeScript, ESLint and three integration/rendering tests pass. PHP's independent
math audit performs 2,051 exact/numerical, content and diagram checks, including
integer thresholds, negative/zero/unit ratios, convergence conditions, complete
trigonometric root sets and the squared GP test's exceptional zero case.
Existing Arena content retains 23,162 row hashes and unrelated table checksums.
The course now has six chapters, 30 lessons and 60 tasks; the old bank and all
previous originals keep their identities, versions and sources.

Headless checks cover 39 local pages at mobile/desktop widths across both sites,
all new part prompts, protected-help boundaries and 16 diagram loads, with no
document overflow or JS/math errors. All six diagrams and representative mobile
notes were visually inspected. Private evidence: `.local/original-series/`.

No push, deployment, production DB writes, schema migration, foreground UI
control, new submission workflow or AI grading calls. Student attempts, teacher
review, AI suggestions and deterministic grades remain separate and unchanged.
