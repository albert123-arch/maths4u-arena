# Versioned teaching packages

Content lives in `content/original/<course>/…`. C1 registers
`9231-fp1/roots-v1.json` in the server-only registry
`src/lib/content-package-content.ts`. Further chapters use the same schema and
administrator workflow; no chapter-specific deployment flags are needed.

The `-v1` filename identifies the schema/major series. The manifest's semantic
`version` identifies the immutable release. Never edit an applied version in
place. Change its version and run dry-run before applying new content.

## Workflow

1. Validate the strict schema, mathematics and public projections in CI.
2. Open `/admin/content-packages`, select **Dry run**. The report gives create,
   new-version and skip counts. It makes no writes.
3. **Apply package** submits that exact snapshot token. Changed state causes
   `STALE_DRY_RUN`; re-run the preview. Only an actual administrator outside a
   viewing lens can apply, publish, archive or restore.
4. First application creates PRIVATE tasks with distinct editorial UIDs, manual
   ORIGINAL provenance and new lesson versions. It reuses the course by slug;
   it never rewrites archived examination tasks or course names.
5. Inspect `/admin/content-packages/<key>` and the private lesson previews.
   **Publish chapter** is a separate administrator action. Until then guests,
   students and teachers cannot read the new content through catalogue,
   hierarchy, checker, source files or sitemap.
6. A later package version appends TaskVersion/LessonVersion records for changed
   content. ImportRecord keeps task identity. Previously published task revisions
   become current when the administrator explicitly applies the new version;
   newly added tasks remain PRIVATE until **Publish chapter**.
7. **Archive package** reversibly archives only its own tasks and lessons.
   **Restore draft** restores them as PRIVATE, without deleting versions,
   responses, reviews or progress. Publishing again requires a separate action.

Application is transactional, locks the actor, rechecks its snapshot and writes
one `ContentRelease` marker per package and version plus an `AuditEvent`.
Reapplying the same version makes no writes, including no new audit record.
The receipt records approved version IDs; an independently edited current task
is rejected by the checker instead of using stale keys. The registry fingerprint
detects changed manifests using the same version.

`ContentPackage` stores administrative state. Existing `Task`, `TaskVersion`,
`LessonVersion`, `ImportRecord`, `IndependentCheck`, `LearningProgress`,
`PracticeStudy` and `Review` remain the canonical models. The package reuses
the complete-answer lesson components, bounded exact algebra, guest storage,
spaced review and separate written self-assessment. Assigned quick-check
answer descriptors are frozen inside immutable TaskPart records; later package
files cannot alter the grading of an old assignment.

Source provenance is stored in administrator-only teacher metadata. Public DTOs
are explicit projections without keys, source exam references, editorial states
or raw package fields. The `/content/` HTTP namespace returns a genuine 404.

## C1 local operation

Use only the existing loopback test runtime:

```powershell
& .local/node22/node.exe scripts/content-package-local.mjs server.js
```

The wrapper validates `MATHS4U_ENV=test`, loopback port 33317 and the exact C1
test-database name pattern. It strips Release D and bootstrap approval flags.
Credentials remain under ignored `.local/`. No new test run needs another
project checkout or another database.

Checks:

```powershell
python scripts/content/verify-fp1-roots.py
node --import tsx --test tests/content-packages.test.ts
node scripts/content-package-local.mjs --import tsx --test tests/content-packages-local.test.ts
$env:ARENA_UX_BASE_URL='http://127.0.0.1:3109'
node node_modules/@playwright/test/cli.js test --config=playwright.ux.config.ts tests/ux-browser/content-c1.spec.ts
```

The browser tests temporarily publish **only on that test database**, exercise
guest checking and self-assessment, and restore the chapter to DRAFT. Eight
synthetic lifecycle questions remain archived; the 94 teaching questions remain
as the owner's draft. These commands do not authorize a production import.

## C2: Rational functions and solution diagrams

After the owner's separate publication command on 6 November, both Roots and
Rational functions are PUBLISHED **locally**. Do not run the Rational lifecycle
or browser publication tests during that review: they intentionally restore
Rational to DRAFT. The paragraphs below describe the initial preparation checks.

The owner has since published C1 **locally**. Do not run the C1 lifecycle/browser
publication tests while reviewing C2: they intentionally restore C1 to DRAFT.
Use `tests/content-rational-local.test.ts` and
`tests/ux-browser/content-c2-rational.spec.ts` for this chapter. They preserve
the published Roots package and restore only Rational functions to DRAFT.

The Rational package contains 53 supplied written questions, five lessons,
20 independently written examples, 40 complete-answer checks and 81 supplied
solution diagrams. Regenerate the normalised JSON from the read-only source
using the committed source audit as both `--audit` and `--assets`. The source
directory is never written to.

Optional package assets are immutable PNGs with declared size, dimensions and
SHA-256. Dry-run verifies their bytes without writing files. Apply installs them
as StoredFile/TaskAsset records in private storage and references their stable
IDs from TaskVersion solution HTML. Repeat application creates neither new
files nor new versions. Existing files are never overwritten or deleted;
content-addressed bytes can be reused after a failed transaction.

These C2 diagrams have role SOLUTION, so raw guest downloads return 404. The
existing support flow issues an actor/version/role-bound material grant after
the learner requests the solution. A grant cannot read a different image or
be reused by a different signed-in actor. Old versions keep their own assets.
Source package files and PNGs in `content/original/` are not public static files.
Next traces these PNGs into standalone output; the deployment packager retains
that private content directory. There are no new chapter-specific runtime flags.

Public keys/provenance remain server-only. A C1 manifest without assets retains
its original fingerprint; installing C2 does not revise or re-import Roots.

## C2: Summation of series

The third package is `9231-fp1-summation`, with chapter `fp1_summation`.
It has four lessons in the mathematical order of coursebook sections 3.1–3.2:
power-sum derivations, finite-sum applications, telescoping, then convergence
and remainders. Teaching text and the 16 worked examples are independently
written. The owner's 68 supplied adaptations have separate ORIGINAL Task
identities; the 32 new quick checks use complete polynomial, rational or
numeric answers and eight multiple-choice checks. No diagram is required.

The optional `polynomial` field uses the existing bounded exact algebra
checker; its addition to the package schema changes no previous manifest
or fingerprint. Rational formulae use the existing numerator/denominator
pair, accepting equivalent fractions by cross multiplication.

Reproduce the source normalisation with:

```powershell
python scripts/content/prepare-fp1-series.py --source 'E:\my folder\questions_data\original\Pure1 9231\03_Summation_of_series_9231_revised.json' --mapping docs/ARENA-C2-SERIES-SOURCE-AUDIT-20261106.json
python scripts/content/verify-fp1-series.py --report .local/c2-series-20261106/math.json
```

The source remains read-only. Mathematical fixtures and source hashes are
committed so CI does not need the E: drive. The mathematics report separates
symbolic PASS checks from reviewed analytic arguments about endpoints.

Roots, Rational and Summation are now PUBLISHED locally. Do not run their
chapter-specific lifecycle or browser-publication tests during owner review:
each test deliberately restores only its own tested chapter to DRAFT.
The new Series tests preserve Roots and Rational's published states.
Use unit tests, a read-only dry-run or the local public preview for review.
No production import or deployment is authorised by these local commands.

## C2: Matrices 1

`9231-fp1-matrices1` reuses the package mechanism and exact-answer engine.
Five lessons follow the mathematical sequence of book sections 4.1–4.4,
with transformations split into plane maps and invariant sets / spatial maps.
They contain 20 independently written examples and 40 complete quick checks.
Matrices use a separate exact field for every entry; partial matrices do not
count as a complete answer. Set fields require every parameter value, and
line equations accept equivalent non-zero scalar multiples.

The owner's 60 questions include 20 adaptations/replacements with archived
source links and 40 new original questions with no examination source.
The latter deliberately omit the optional source-link object: no archive ID
is invented. The source audit records all 60 editorial identities.
There are no images or new database migrations in this chapter.

```powershell
python scripts/content/prepare-fp1-matrices.py --source 'E:\my folder\questions_data\original\Pure1 9231\04_Matrices_1_9231_revised.json' --mapping docs/ARENA-C2-MATRICES-SOURCE-AUDIT-20261106.json
python scripts/content/verify-fp1-matrices.py --report .local/c2-matrices-20261106/math.json
```

The verifier works without the E: drive in CI, using immutable content-bound
fixtures. When `--owner` is supplied it additionally verifies the source SHA
and directly compares every supplied answer, hint, solution, part and mark.
REVIEWED entries identify analytic/geometric completeness arguments separately
from exact symbolic PASS checks. Source inputs are never written to.

All four FP1 packages are PUBLISHED locally. The Matrices lifecycle and browser
publication tests preserve the three older packages, but intentionally restore
Matrices to DRAFT. Do not run them against the owner's published preview
unless that temporary state change is intended.

## C2: Polar coordinates

`9231-fp1-polar` adds chapter 5 through the same append-only package mechanism.
Five lessons follow the mathematical sequence of sections 5.1–5.2: coordinates,
sketches, intersections, areas and extrema. Teaching and 20 worked examples
are independently written. All 63 owner questions retain their keys, hints,
solutions, marks and criteria; all 63 archive mappings are administrative only.
There are 40 complete-answer quick checks with fresh variants and review.

The exact parser now accepts `pi`, Unicode π and LaTeX pi, retaining bounded
polynomial algebra, fractions and surds. It does not implement arbitrary
functions, square roots of pi or division by expressions containing pi.
Existing pi-free answer keys and progress identities remain unchanged.

The source JSON refers to solution SVGs but its images directory is absent.
The owner's companion teacher-review HTML contains all 64 embedded model SVGs.
The media preparer verifies article identity, title, filename and solution-only
placement, then generates private hash-addressed PNGs. It never rasterises
inline formula SVGs. The source files are read only.

```powershell
node scripts/content/prepare-fp1-polar-media.mjs --source 'E:\my folder\questions_data\original\Pure1 9231\05_Polar_coordinates_9231_revised.json' --html 'E:\my folder\questions_data\original\Pure1 9231\9231_Chapter_05_Teacher_Review.html' --metadata .local/c2-polar-20261106/assets.json
python scripts/content/prepare-fp1-polar.py --source 'E:\my folder\questions_data\original\Pure1 9231\05_Polar_coordinates_9231_revised.json' --mapping docs/ARENA-C2-POLAR-SOURCE-AUDIT-20261106.json --assets .local/c2-polar-20261106/assets.json
python scripts/content/verify-fp1-polar.py --report .local/c2-polar-20261106/math.json
```

CI uses content-bound fixtures without owner drives. Optional `--owner` also
checks the source SHA and compares the supplied fields directly. Symbolic
identities, numerical diagnostics and reviewed completeness arguments are
reported separately. There is no new database migration or source-copy import.
Images require the existing solution grant; raw URLs remain 404.

The Polar lifecycle/browser tests temporarily publish, archive and restore
only Polar to DRAFT. They preserve all four older published packages. Run
these only against the explicitly guarded local test database. Final local
publication is a separate action after those tests.

## C2: Vectors

`9231-fp1-vectors` adds chapter 6 without a schema migration or a new answer
grammar. Five lessons follow book sections 6.1–6.3: products, lines, planes,
distances and parameter exceptions. Notes and 20 examples are independently
written; the 84 owner questions retain all 258 parts, 975 marks and their
answers, hints, solutions and guidance. All 84 archive mappings remain private
administrative provenance, never learner-facing examination references.

There are 40 complete-answer quick checks (30 SHORT and 10 MC), with fresh
variants and review. Vectors and feet require every coordinate. A plane is
explicitly normalised to x-coefficient 1 and asks for B, C and D; an intersection
line fixes its anchor at z=0 and its direction's z-component at 1. These are
complete specified answers, not a parser for arbitrary three-variable equations.
Parameter sets require every root; parallel exceptions use a separate formula.

The owner's teacher-review HTML embeds eight model SVGs directly inside
solution figures, rather than in img tags. The media preparer matches article
number, title and SVG title to the owner's JSON, preserves XML attribute case,
and extracts only model figures. It does not rasterise the nested MathJax SVGs.
Eight unique PNGs (454,892 bytes, maximum side 1600 px) use immutable SOLUTION
files and existing per-session grants; raw paths and another session's grant
remain inaccessible. Both owner files are read-only.

```powershell
node scripts/content/prepare-fp1-vectors-media.mjs --source 'E:\my folder\questions_data\original\Pure1 9231\06_Vectors_9231_revised.json' --html 'E:\my folder\questions_data\original\Pure1 9231\9231_Chapter_06_Teacher_Review.html' --metadata .local/c2-vectors-20261106/assets.json
python scripts/content/prepare-fp1-vectors.py --source 'E:\my folder\questions_data\original\Pure1 9231\06_Vectors_9231_revised.json' --mapping docs/ARENA-C2-VECTORS-SOURCE-AUDIT-20261106.json --assets .local/c2-vectors-20261106/assets.json
python scripts/content/verify-fp1-vectors.py --report .local/c2-vectors-20261106/math.json
```

CI uses content-bound fixtures and geometry models without the E: drive.
Optional `--owner` additionally verifies the SHA and every supplied field.
The report distinguishes symbolic/numeric PASS checks from reviewed converse
and completeness arguments. Owner keys and marks required no corrections.

All six FP1 packages are PUBLISHED locally. The Vectors lifecycle/browser tests
preserve the five older packages, but deliberately restore only Vectors to DRAFT.
Use those mutation tests only on the guarded local test database, not during
owner preview. Final local publication was performed separately after tests;
repeat application skipped all 124 tasks with zero writes. These commands
authorise neither production import nor deployment.
