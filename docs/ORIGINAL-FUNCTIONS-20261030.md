# Original Functions — second local block

Local preview:
<http://127.0.0.1:3103/courses/maths4u-9709-p1?chapter=orig_9709_p1_functions>.

Five English guides, 15 examples, ten new exam-style tasks, 30 parts and 73
indicative marks. Canonical source: the PHP repository's
`content/original/functions-v1.json`, projected byte for byte here. The full report
is `D:/www/AS&A level maths/AS-Alevel/docs/functions-original-20261030.md`.

Editorial IDs `M4U-ORIG-FUNC-001`–`010` use new Task identities with ImportRecord
keys `maths4u / original:<UID>`. The new chapter and five lessons sit alongside
Quadratics in the existing local Pure 1 course. No imported courses/tasks move or
disappear. Each MANUAL part has an answer, solution criteria, alternative methods
and a mark limit; the task's indicative marking text is DRAFT, not official/OCR
material or a claimed teacher-verified scheme. AI-assisted provenance and pending
independent teacher editorial review are explicit.

`src/lib/original-blocks.ts` provides common validation/import for both blocks.
`original-quadratics.ts` keeps its prior API as a compatibility facade. Repeating
an import skips existing content without creating versions; changed content must
use an explicit version migration. Unknown mappings, mixed block UIDs and
inconsistent criteria are rejected. The local-only fence remains inside the
importer as well as the runtime wrapper.

```powershell
& .local/node22/node.exe scripts/bank/with-local.mjs --import tsx scripts/import-original-functions-local.ts
```

TypeScript, ESLint and both integration tests pass. The PHP math checks cover
all examples/parts (5,689 checks). Old content, including Quadratics, retains
22,614 individual row hashes; unrelated table checksums are unchanged. The
headless browser checked all new question lists and representative notes at two
widths, with no missing prompts, overflow, formula errors or protected-help leaks.
Mappings, screenshots and checks are in `.local/original-functions/`.

Paper self-study, teacher assignment submission and marking remain unchanged.
No AI calls, production writes, deployment or push were performed; no foreground
windows/tabs were controlled.
