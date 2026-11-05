# Original Differentiation — eighth local block

Preview:
<http://127.0.0.1:3103/courses/maths4u-9709-p1?chapter=orig_9709_p1_differentiation>.

Five English guides, 15 examples, ten new exam-style tasks, 30 parts, 77
indicative marks and six original diagrams. Canonical PHP source:
`D:/www/AS&A level maths/AS-Alevel/content/original/differentiation-v1.json`,
projected byte for byte with its SVGs. Full report:
`D:/www/AS&A level maths/AS-Alevel/docs/differentiation-original-20261030.md`.

The eighth original chapter and five lessons cover derivatives/domains,
tangents/normals, monotonicity/stationary points, rates and optimisation.
Editorial UIDs `M4U-ORIG-DIFF-001`–`010` map through ImportRecord keys
`maths4u / original:<UID>` to new Task identities, each with one immutable
TaskVersion and three MANUAL parts. Every part has an answer, solution and named
criteria with alternatives and mark limits. Marking is DRAFT Maths4U guidance;
AI-assisted preparation and pending independent teacher editorial review are
explicit. No official question, diagram or mark scheme was copied.

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-block-local.ts differentiation
```

Imports remain local-only, additive and registered-pack-only. Repeats skip ten
tasks without new versions; changed content still requires explicit version
migration. Six exact same-origin SVG paths are added to the renderer's allowlist,
retaining all prior diagram paths and private-file permissions. Unknown/external
paths, queries, traversal and event attributes remain rejected.

TypeScript, ESLint and three integration/rendering tests pass. PHP's independent
math audit performs 3,144 exact/numerical, domain, content, duplicate and SVG
checks, including exact difference quotients, high-precision numerical derivatives,
zero-gradient normals, stationary inflections, endpoint ties, signed rates,
admissible dimensions and global optimum proofs. All examples and parts are
audited. Existing Arena content retains 23,436 row hashes and all unrelated
table checksums. The original course now has eight chapters, 40 lessons and
80 tasks, with previous identities, versions and sources intact.

Headless checks cover 43 local pages at mobile/desktop widths across both sites,
all new part prompts, protected-help boundaries and 16 diagram loads, with no
document overflow or JS/math errors. All six diagrams and representative mobile
notes were visually inspected. The tangent/normal diagram has equal axis units;
the optimisation graph marks excluded endpoints. Private evidence:
`.local/original-differentiation/`.

No push, deployment, production writes, schema migration, foreground UI control,
new submission workflow or AI grading calls. The legacy bank remains available;
student responses, deterministic grades, teacher reviews and AI suggestions keep
their existing separation and permissions.
