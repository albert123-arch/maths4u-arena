# Original Trigonometry — fifth local block

Preview:
<http://127.0.0.1:3103/courses/maths4u-9709-p1?chapter=orig_9709_p1_trigonometry>.

Five English guides, 15 examples, ten new exam-style tasks, 30 parts, 74 suggested
marks and six original mathematical diagrams. Canonical PHP source:
`content/original/trigonometry-v1.json`, projected byte for byte with its SVGs.
Full report: `D:/www/AS&A level maths/AS-Alevel/docs/trigonometry-original-20261030.md`.

The fifth original chapter and five lessons sit inside the existing local Pure 1
course. Editorial UIDs `M4U-ORIG-TRIG-001`–`010` map through ImportRecord keys
`maths4u / original:<UID>` to new Task identities. Each task has one immutable
version and three MANUAL parts, with answers, named criteria, alternative methods
and mark limits. Suggested marking is DRAFT Maths4U guidance. AI-assisted
preparation and pending independent teacher editorial review are explicit.

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-block-local.ts trigonometry
```

Imports remain registered-pack-only and local-only. Repeats skip ten tasks without
new versions; conflicts require an explicit version migration. The exact SVG
allowlist adds six paths under `/assets/original/trigonometry/`, retaining prior
diagram paths and private-file handling. Unsafe/unknown paths and event attributes
are rejected; arbitrary inline SVG is not enabled. Tangent diagrams use separate
branches, not paths joining across excluded inputs.

TypeScript, ESLint and three integration/rendering tests pass. The PHP math audit
performs 3,788 ratio/domain/root/graph checks, including original-residual bisection
for the final numerical roots. Existing content retains 23,025 row hashes and
unrelated table checksums. The course has 25 lessons and 50 tasks across five
original chapters, with all previous content intact. Headless browser checks
cover both widths, all new prompts/diagrams and protected-help boundaries. All
six diagrams and representative mobile notes were visually inspected. Local maps,
checks and screenshots: `.local/original-trigonometry/`.

No schema migration, production writes, push, deployment, foreground UI control,
new submission workflow or AI grading calls were performed. Existing banks,
versions, student history, paper study and teacher/AI grading boundaries remain.
