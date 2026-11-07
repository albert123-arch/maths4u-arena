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

## C3: Proof by induction

`9231-fp1-induction` adds chapter `fp1_induction`, position 6. It uses the
mathematical order of book sections 7.1–7.2, with independently authored notes,
20 examples, 30 written problems and 40 short checks. No owner question file,
archive mapping, third-party question or image is imported. `source.supplied`
is zero; `source.sha256` binds the committed authoring brief, not an invented
examination source. The source audit explicitly records null archive links.

There are five lessons, each with six written problems and eight quick checks
(six SHORT, two MC). Short fields require the whole requested algebraic bridge,
all coefficients or matrix entries, and exact residues. MC checks target proof
logic. These are ingredients of a proof, not automated assessment of a full
induction argument. Written proofs remain MANUAL, with separate hints, worked
solutions, DRAFT indicative criteria and paper self-assessment. Existing frozen
assignment grading and learner progress mechanisms are unchanged.

```powershell
python scripts/content/prepare-fp1-induction.py
python scripts/content/verify-fp1-induction.py --report .local/c3-induction-20261106/math.json
```

Both commands are independent of owner drives. The preparer creates the manifest,
verification models and source audit; it reads no examination dataset. The verifier
binds every model to the actual question/example and lesson content, then checks
base cases and symbolic transitions. Divisibility uses integer exponential
remainders or integral Newton coefficients of the polynomial quotient, covering
all non-negative integers; finite substitutions are additional diagnostics.
REVIEWED distinguishes author review of written logic and completeness from
symbolic PASS results and does not imply external peer review.

Final local version is 1.0.2. A source comparison before owner preview found
coincidences between several initially authored standard formulae and book
exercises. Those examples/variants were independently replaced. The already
applied local 1.0.0 was preserved: applying 1.0.1 appended 70 TaskVersions under
the existing package-version mechanism, without deleting the earlier versions
or their QA records. Version 1.0.2 fixes the intermediate expansion in example
E-S3 and adds a direct symbolic equality check. It appends another 70 immutable
TaskVersions; all 140 previous versions and nested records were verified intact.
There is one receipt per version; repeat application of 1.0.2 skips all 70 tasks
and writes nothing. A clean database imports only 1.0.2.

All seven FP1 packages are now PUBLISHED locally. The chapter-specific lifecycle
and browser tests preserve all six older published packages but intentionally
restore Induction to DRAFT. Run those mutation tests only through the guarded
loopback test runtime. Final local publication is performed separately after
testing. Cross-topic revision, production import and deployment are not included.

## C5: Further Probability & Statistics — Continuous random variables

`9231-stats-crv` 1.0.0 reuses `maths4u-9231-statistics` and its existing course
identity. It adds chapter `stats_crv`, with five lessons in the mathematical
order of book sections 8.1–8.4: densities, cumulative probabilities, moments,
monotone transformations, then piecewise distributions and inverse branches.
Notes and 20 examples are independently written. All 38 supplied owner tasks
retain 119 parts, 343 marks, answers, hints, solutions and criteria. Their 38
archive mappings remain administrator-only; original examination rows stay intact.

Each lesson has eight complete short checks (six SHORT, two MC), including
fresh variants and weak-skill review. They ask for all requested coefficients,
quartiles, CDF branches and support endpoints. Rational densities use the existing
numerator/denominator field with an explicit format; fractions and exact surds
remain supported. No general exponential/logarithmic input parser is introduced.
Those supplied written questions remain MANUAL paper self-study with DRAFT guidance.

```powershell
node scripts/content/prepare-stats-crv-media.mjs --source 'E:\my folder\questions_data\original\Statistics 9231\01_Continuous_random_variables_9231_revised.json' --html 'E:\my folder\questions_data\original\Statistics 9231\9231_Statistics_Chapter_01_Teacher_Review.html' --metadata .local/c5-crv-20261106/assets.json
python scripts/content/prepare-stats-crv.py --source 'E:\my folder\questions_data\original\Statistics 9231\01_Continuous_random_variables_9231_revised.json' --mapping docs/ARENA-C5-CRV-SOURCE-AUDIT-20261106.json --assets .local/c5-crv-20261106/assets.json
python scripts/content/verify-stats-crv.py --report .local/c5-crv-20261106/math.json
```

The teacher HTML embeds 16 Matplotlib model SVGs inside solution figures.
The preparer verifies article number/title, the JSON image path and alt text,
SVG aria-label and its filename-prefixed element IDs. It preserves XML attribute
case and does not rasterise the thousands of formula SVGs. The result is 16
immutable SOLUTION PNGs (813,878 bytes, maximum side 1600 px), served only through
the existing session/version/role-bound solution grants. Raw URLs remain 404.
The owner source files are read-only; the 11 earlier source images are not reused.

The verifier recomputes statement-derived density models, checks their mass,
sign and CDF joins, and parses the actual supplied scalar/CDF/PDF answers.
Compact TeX arguments are made explicit only inside the verifier; owner text
is unchanged. CDF methods precede transformed densities, including reversed
inequalities and mapped breakpoints. Quantiles are checked in their actual
branches; the rounded numerical percentile uses a probability bracket.
REVIEWED separates author review of sketches and reasoning from symbolic PASS.
The verifier and content-bound fixtures run in CI without the E: drive; optional
`--owner` adds direct hash, content and criterion comparisons.

All eight packages (seven FP1 chapters plus Statistics chapter 1) are PUBLISHED
locally. The Statistics lifecycle/browser tests preserve all seven older packages
and deliberately restore only Statistics to DRAFT. Run those mutations solely on
the guarded loopback test database. Final local publication is a separate action
after tests; repeat skips 78 questions with zero writes. Production import,
deployment and subsequent Statistics chapters are not included.

## C5: Further Probability & Statistics — Inferential statistics

`9231-stats-inference` 1.0.0 adds chapter `stats_inference` to the same course.
Six lessons follow the mathematical order of book sections 9.1–9.5: one-sample
t, independent normal comparisons, pooled variance and two-sample t, paired t,
one-mean intervals and reverse calculations, then mean-difference intervals.
Notes and 24 examples are independently authored; no book exercise or diagram
is reproduced. All 67 owner tasks retain their 120 parts, 555 marks, keys,
solutions and criteria. All archive mappings remain administrator-only.

There are 48 complete short checks, six SHORT and two MC per lesson. They use
exact fractions/surds and explicitly stipulated critical values where relevant,
so deterministic checking does not silently accept an arbitrary tolerance.
Every requested statistic, degree of freedom, recovered summary and interval
endpoint must be present. Written inference and reasoning stay MANUAL paper
self-study with indicative DRAFT guidance, separate from automatic scores.
New example display chains are split into gathered rows for mobile reading.

```powershell
python scripts/content/prepare-stats-inference.py --source 'E:\my folder\questions_data\original\Statistics 9231\02_Inferential_statistics_9231_revised.json' --mapping docs/ARENA-C5-INFERENCE-SOURCE-AUDIT-20261106.json
python scripts/content/verify-stats-inference.py --source 'E:\my folder\questions_data\original\Statistics 9231\02_Inferential_statistics_9231_revised.json'
python scripts/content/verify-stats-inference.py --report .local/c5-inference-20261106/ci-math.json
```

The independent verifier uses exact sample arithmetic, high-precision normal
and Student t probabilities and inverse CDFs, plus direct density integration
as a second quantile check. It binds the displayed source data, statistics and
interval limits, full quick keys and content hashes. The CI mode needs no E:
drive. Optional `--source` also compares the immutable owner texts and criteria
and rechecks its SHA-256. No owner key or mark was corrected.

The local lifecycle/browser mutation tests preserve the eight older published
packages and restore only this package to DRAFT. Use only the guarded loopback
test runtime. Final local publication is separate; repeating the import skips
115 tasks with zero writes. No new assets or database migrations are introduced.
Production import and the remaining Statistics chapters are outside this work.

## C5: Further Probability & Statistics — Chi-squared tests

`9231-stats-chi2` 1.0.1 adds chapter `stats_chi2` to the existing Statistics
course. Four lessons follow the mathematical order of book sections 10.1–10.4:
specified discrete goodness of fit, fitted discrete models, continuous models,
and contingency tables. Hypotheses and Pearson’s statistic precede fitting and
pooling. Notes and 16 examples are independently authored; no book exercise,
explanation or diagram is reproduced.

All 35 owner tasks keep their 74 parts, 303 marks, keys, hints, solutions and
criteria. Archive mappings remain administrator-only. Each lesson has six SHORT
and two MC checks, with fresh variants and weak-skill review. Complete expected
counts, contributions, parameter estimates and degrees of freedom are required.
Written reasoning stays MANUAL paper self-study with indicative DRAFT guidance.
There are only five supplied continuous-model tasks; this shortage is documented
rather than duplicating a task to reach six.

```powershell
python scripts/content/prepare-stats-chi2.py --source 'E:\my folder\questions_data\original\Statistics 9231\03_Chi_squared_tests_9231_revised.json' --mapping docs/ARENA-C5-CHI2-SOURCE-AUDIT-20261106.json
python scripts/content/verify-stats-chi2.py --source 'E:\my folder\questions_data\original\Statistics 9231\03_Chi_squared_tests_9231_revised.json'
python scripts/content/verify-stats-chi2.py --report .local/c5-chi2-20261106/ci-math.json
```

The independent verifier reads the actual observed and expected HTML tables,
recomputes binomial/Poisson probabilities, continuous integrals and normal tails,
then checks pooled tables, Pearson contributions, df, critical values, p-values
and displayed answers. It also checks the second classification in question 29,
whole-column pooling, proportions and the independent-sample scaling threshold.
Inverse-gamma critical values are cross-checked by direct chi-squared density
integration. The CI mode needs no E: drive. Optional `--source` compares the
original texts and criteria and verifies the SHA-256.

The owner explicitly approved correcting question 18 from 80.612 to the exact
midpoint estimate 80.6125 in its local answer and solution. Its source on E:,
marks and criteria remain unchanged. The chapter also normalises question-part
wrappers to the existing ol.parts layout with letters and right-hand marks,
without changing the stems or individual prompts. The active manifest is
chi2-v1.0.1.json; chi2-v1.json preserves the initially tested 1.0.0 manifest.
The revision appends 67 immutable TaskVersions (the package version is recorded
in each teacher note) without creating Tasks. All 67 earlier versions and their
nested data and QA checks are retained. There is one receipt per version; a clean
installation imports only the active 1.0.1. Repeat application writes nothing.

The local lifecycle/browser mutation tests preserve all nine older published
packages and restore only this one to DRAFT. Use the guarded loopback runtime.
Final local publication is separate; repeating the import skips 67 tasks with
zero writes. No assets, new dependencies or schema migrations are introduced.
Production operations and the remaining Statistics chapters are not included.

## C5: Further Probability & Statistics — Non-parametric tests

`9231-stats-nonparam` 1.0.0 adds chapter `stats_nonparam` to the existing
Statistics course. Four lessons follow the mathematical sequence of sections
11.1–11.6: assumptions and sign tests (including paired changes), one-sample
signed ranks, matched-pairs signed ranks, and independent-sample rank sums.
Notes and 16 examples are independently authored; no book exercise, wording
or diagram is reproduced.

All 27 owner tasks retain their 52 parts, 227 marks, keys, hints, solutions and
criteria. Archive mappings remain administrator-only. Prompt wrappers use the
existing ol.parts layout, with letters and right-hand marks. Each lesson has
six SHORT and two MC checks, including fresh variants and weak-skill review.
The sign-test lesson contains only two supplied written tasks; that shortage
is documented instead of duplicating tasks. Written reasoning stays MANUAL
paper self-study with indicative DRAFT guidance, separate from automatic scores.

```powershell
python scripts/content/prepare-stats-nonparam.py --source 'E:\my folder\questions_data\original\Statistics 9231\04_Non_parametric_tests_9231_revised.json' --mapping docs/ARENA-C5-NONPARAM-SOURCE-AUDIT-20261106.json
python scripts/content/verify-stats-nonparam.py --source 'E:\my folder\questions_data\original\Statistics 9231\04_Non_parametric_tests_9231_revised.json'
python scripts/content/verify-stats-nonparam.py --report .local/c5-nonparam-20261106/ci-math.json
```

The independent verifier reads the actual data/ranking tables, recomputes
exact decimal deviations and ranks, binomial probabilities, signed-rank subset
distributions and rank-sum allocation distributions. Independent exhaustive
sign/combination enumeration cross-checks the exact recurrences. Directional
normal tails, continuity corrections, recording corrections, reranking, pooled
t comparison and adjacent attainable integer boundaries are checked. The
normal moments belong to directional sums, not their folded minima; MF19's
same-sample reflection is distinguished from min(RA,RB) for unequal samples.
Teaching models bind all example/quick-check answers to content hashes. The
CI mode requires no E: drive. Optional --source also checks unchanged owner
texts, criteria and SHA-256. No owner answer or mark was corrected.

The guarded lifecycle/browser tests preserve all ten older published packages
and restore only this one to DRAFT. Final local publication is separate;
repeat application skips 59 tasks with zero writes. No assets, dependencies
or schema migrations are introduced. Use only the guarded loopback test runtime.
Production operations and Probability generating functions are outside this work.

## C5: Further Probability & Statistics — Probability generating functions

9231-stats-pgf 1.0.0 adds chapter stats_pgf to the existing Statistics course.
Five lessons follow sections 12.1–12.4 in mathematical order: constructing
and reading PGFs, recovering distributions and moments, independent sums,
transformations and dependence, and repeated independent sums.
Notes and 20 examples are independently authored; no book exercise, wording
or diagram is reproduced.

All 50 owner tasks retain their 167 parts, 437 marks, keys, hints, solutions
and criteria. The normaliser explicitly handles this export's source_id and
source_uid provenance fields. Archive mappings stay administrator-only.
Prompt wrappers use the existing ol.parts layout with letters and right-hand
marks. Each lesson has six SHORT and two MC checks, fresh variants and review.
Complete probability polynomials and rational PGFs are checked with the existing
bounded exact parser; rational fields use numerator; denominator, without
changing parser limits. Written reasoning stays MANUAL paper self-study
with indicative DRAFT guidance.

Rebuild using the immutable owner file and the checked mapping:

    python scripts/content/prepare-stats-pgf.py --source 'E:\my folder\questions_data\original\Statistics 9231\05_Probability_generating_functions_9231_revised.json' --mapping docs/ARENA-C5-PGF-SOURCE-AUDIT-20261106.json
    python scripts/content/verify-stats-pgf.py --source 'E:\my folder\questions_data\original\Statistics 9231\05_Probability_generating_functions_9231_revised.json'
    python scripts/content/verify-stats-pgf.py --report .local/c5-pgf-20261106/ci-math.json

The independent verifier reconstructs all 50 statement models and parses actual
TeX PGFs, derivatives, moments and selected scalar answers. It checks exact
coefficient convolution, hypergeometric and joint selection probabilities,
finite-support moments, strict adjacent integer bounds, transformed support,
mixtures, conditional counts and roots of repeated sums. Direct enumeration
cross-checks conditional totals. Full example and quick-check keys are bound
to the content by hashes. CI requires no E: drive; optional --source also checks
unchanged owner texts, criteria and SHA-256. No owner key or mark was corrected.

The guarded lifecycle/browser tests preserve all eleven older published packages
and restore only this one to DRAFT. Final local publication is separate.
Repeating the package skips 90 tasks with zero writes. No assets, dependencies
or schema migrations are introduced. Use only the guarded loopback test runtime.
Production operations and any further course are outside this work.

## C5: Further Pure 2 — Hyperbolic functions

9231-fp2-hyperbolic 1.0.0 adds fp2_hyperbolic to the existing FP2 course.
Six lessons, 24 independently authored examples, 48 complete-answer checks,
and all 50 owner tasks (104 parts, 337 marks). There are 44 new tasks and
six adaptations with explicit archive mappings. Private provenance is omitted
from public DTOs. The final five tasks disclose later calculus/ODE prerequisites.
Eleven solution graphs come from exact matching owner Teacher Review articles;
they use hashed PNG assets and the existing protected material-grant API.
No images are leaked in prompts. No migrations or dependencies are added.

Rebuild and verify:

    python scripts/content/prepare-fp2-hyperbolic.py --source 'E:\my folder\questions_data\original\Pure 2 9231\01_Hyperbolic_functions_9231_FP2_revised.json' --mapping docs/ARENA-C5-FP2-HYPERBOLIC-SOURCE-AUDIT-20261107.json --assets .local/c5-fp2-hyperbolic-20261106/assets.json
    python scripts/content/verify-fp2-hyperbolic.py --source 'E:\my folder\questions_data\original\Pure 2 9231\01_Hyperbolic_functions_9231_FP2_revised.json'
    python scripts/content/verify-fp2-hyperbolic.py --report .local/c5-fp2-hyperbolic-20261106/ci-math.json

CI needs no E: drive. Exact statement models verify all owner tasks, keys,
examples, branch restrictions, identities and cross-topic extensions. Written
reasoning remains MANUAL with indicative DRAFT marking guidance. Full quick
checks use the existing bounded parser, including positive exponential-root
sets rather than arbitrary transcendental-expression equivalence.
The guarded lifecycle/browser tests leave the older twelve packages unchanged
and restore only this package to DRAFT. Final local publication is separate.
Repeat skips 98 tasks with zero writes. Production is outside this work.

## C5: Further Pure 2 — Matrices 2

9231-fp2-matrices2 1.0.1 adds fp2_matrices2 to the existing FP2 course.
Seven lessons follow book sections 20.1–20.4, with independently authored
notes and 28 examples, 56 full-answer checks and all 70 owner tasks
(206 parts, 729 marks). Source revision_type is explicitly mapped for
63 rewritten, six syllabus-replacement and one syllabus-adjusted task.
All archive links are private; new ORIGINAL identities preserve the archive.
No owner answers, criteria or marks are corrected. There are no assets.

Rebuild and verify:

    python scripts/content/prepare-fp2-matrices2.py --source 'E:\my folder\questions_data\original\Pure 2 9231\02_Matrices_2_9231_FP2_revised.json' --mapping docs/ARENA-C5-FP2-MATRICES2-SOURCE-AUDIT-20261107.json
    python scripts/content/verify-fp2-matrices2.py --source 'E:\my folder\questions_data\original\Pure 2 9231\02_Matrices_2_9231_FP2_revised.json'
    python scripts/content/verify-fp2-matrices2.py --report .local/c5-fp2-matrices2-20261107/ci-math.json

The independent verifier reads actual TeX matrices/claims and checks exact
eigenpairs, characteristic polynomials, displayed row reductions, inverses,
diagonalisations, powers, parameter boundaries, full system families and
geometric intersections. CI requires no E: drive. Keys require all entries,
coordinates or coefficients, including complete free-parameter polynomials.
Prescribed eigenvector normalisations make the expected answer unambiguous.
No parser, dependencies or schema changes are introduced.

The first local rehearsal 1.0.0 is retained. Version 1.0.1 typesets powers in
the new teaching prose as KaTeX, preserving keys/criteria and immutable task
history. Reapplying skips 126 tasks with zero writes. Lifecycle/browser tests
leave the older thirteen packages unchanged and restore only this one to DRAFT;
final local publication is separate. Production remains outside this task.

## C5: Further Pure 2 — Differentiation

9231-fp2-differentiation 1.0.0 adds fp2_differentiation to the existing course.
Six lessons follow the mathematical sequence of book 21.1–21.4, with local
geometry separated for clarity. All explanations and 24 examples are independently
authored. All 77 owner tasks (189 parts, 684 marks) are retained alongside
48 complete-answer quick checks. Seven ODE and three integration links disclose
their later-topic prerequisites. No old archive illustrations are reused.

Rebuild and verify:

    python scripts/content/prepare-fp2-differentiation.py --source 'E:\my folder\questions_data\original\Pure 2 9231\03_Differentiation_9231_FP2_revised.json' --mapping docs/ARENA-C5-FP2-DIFFERENTIATION-SOURCE-AUDIT-20261107.json
    python scripts/content/verify-fp2-differentiation.py --source 'E:\my folder\questions_data\original\Pure 2 9231\03_Differentiation_9231_FP2_revised.json'
    python scripts/content/verify-fp2-differentiation.py --report .local/c5-fp2-differentiation-20261107/ci-math.json

CI needs no E: drive. Independent models read actual TeX result claims and verify
implicit/parametric derivatives, regular stationary sets, inverse branches,
Maclaurin polynomials, factorials, labelled integrals and ODE residuals/initial
data. The content and verification models are hash-bound. No owner keys, criteria
or marks are corrected. Source IDs and archive mappings remain private.

Full short checks use the existing bounded parser: rational functions in the
specified variables, full polynomials and complete sets/pairs. Hyperbolic formulas
explicitly request c/h polynomials or a radical structure; arbitrary transcendental
equivalence is not claimed. Written reasoning stays MANUAL paper self-study with
indicative DRAFT guidance. There are no assets, migrations or new dependencies.
Guarded lifecycle/browser tests preserve the older fourteen packages and restore
only this one to DRAFT; final local publication is separate. Repeat skips 125
tasks with zero writes. Production is outside this task.

## C5: Further Pure 2 — Integration

`9231-fp2-integration` 1.0.0 adds `fp2_integration` to the same course.
Six lessons follow the mathematical order of book 22.1–22.4: integration
techniques; algebraic/exponential reductions; trigonometric/hyperbolic
reductions; arc length; curved surfaces; rectangle estimates and limits.
All explanations and 24 examples are independently authored. All 109 supplied
owner problems (268 parts, 1051 marks) retain their answers and criteria.
There are 48 new complete-answer short checks with variants and review.
Means and volumes are identified as prerequisite applications.

Rebuild from the read-only owner file and the committed source audit:

    python scripts/content/prepare-fp2-integration.py --source 'E:\my folder\questions_data\original\Pure 2 9231\04_Integration_9231_FP2_revised.json' --mapping docs/ARENA-C5-FP2-INTEGRATION-SOURCE-AUDIT-20261107.json --assets docs/ARENA-C5-FP2-INTEGRATION-SOURCE-AUDIT-20261107.json
    python scripts/content/verify-fp2-integration.py --source 'E:\my folder\questions_data\original\Pure 2 9231\04_Integration_9231_FP2_revised.json'
    python scripts/content/verify-fp2-integration.py --report .local/c5-fp2-integration-20261107/ci-math.json

CI needs no E: drive. It uses hash-bound fixtures, actual supplied TeX claims,
independent 55-digit quadrature, exact differentiation and summation, endpoint
and least-integer checks. Sampled recurrence checks are not represented as
symbolic proofs for every n. External teacher review remains outstanding.

23 content-addressed PNGs were extracted from the owner's active teacher-review
articles, with article/alt matching, SVG safety checks and source hashes recorded
in the audit. The package schema now allows existing STATEMENT as well as
SOLUTION roles: 18 statement images and five solution images. Existing file
permissions, inline/gallery deduplication and actor-bound help grants are reused.
Direct solution links, draft/archived statements and raw package files stay hidden.
No old archive images, database migrations or new dependencies are introduced.

All 109 written tasks remain MANUAL paper self-study with indicative DRAFT
guidance. Exact short checks use the existing bounded algebraic parser and
explicit complete coefficient structures, not arbitrary transcendental matching.
The guarded local lifecycle preserves all fifteen preceding packages and returns
this one to DRAFT for browser checks; final local publication is separate.
Repeat skips 157 tasks with zero writes. Production is outside this task.

## C5: Further Pure 2 — Complex numbers

`9231-fp2-complex` 1.0.0 adds `fp2_complex` to the same course. Five lessons
follow book 23.1–23.4, separating basic powers/geometry from multiple-angle
polynomial applications. All 59 owner tasks (146 parts, 551 marks) retain their
keys, solutions and guidance. There are 20 independently authored examples
and 40 complete-answer quick checks, with variants and review.

Rebuild from the read-only source and committed audit:

    python scripts/content/prepare-fp2-complex.py --source 'E:\my folder\questions_data\original\Pure 2 9231\05_Complex_numbers_9231_FP2_revised.json' --mapping docs/ARENA-C5-FP2-COMPLEX-SOURCE-AUDIT-20261107.json --assets docs/ARENA-C5-FP2-COMPLEX-SOURCE-AUDIT-20261107.json
    python scripts/content/verify-fp2-complex.py --source 'E:\my folder\questions_data\original\Pure 2 9231\05_Complex_numbers_9231_FP2_revised.json'
    python scripts/content/verify-fp2-complex.py --report .local/c5-fp2-complex-20261107/ci-math.json

CI needs no E: drive. Hash-bound models verify exact complex/Laurent algebra,
polynomial root completeness and independent real-root counts, unity products
and reciprocal sums in a quotient ring, direct finite/binomial sums,
convergence conditions, 55-digit quadrature and actual printed TeX results.
Numerical samples of general formulas are distinguished from symbolic proofs.
Independent teacher review remains outstanding.

Nine PNGs come from the active owner review articles, matched by exact alt and
question number; Q52 has two diagrams. Source HTML/SVG and output PNG hashes
are in the audit. All assets are SOLUTION-only and use the existing private
file/grant boundary. No new migrations, dependencies, permission or renderer
changes are needed. Archived diagrams and Task/TaskVersion records are retained.

Quick checks require every component, all roots, whole polynomials/quotients,
all harmonic coefficients or full parameter intervals. Exponential roots use
the complete rational angle-coefficient set and positive modulus. The existing
bounded exact parser is retained; arbitrary transcendental equivalence is not
claimed. Written reasoning stays MANUAL paper self-study with indicative DRAFT
guidance. The guarded lifecycle preserves all sixteen older packages and restores
this one to DRAFT for browser QA. Final publication is local only; repeat skips
99 tasks with zero writes. Production is outside this task.


## C5: Further Pure 2 — Differential equations

`9231-fp2-ode` 1.0.0 adds `fp2_ode` to the same course. Five lessons follow
book 24.1–24.4: first order, complementary functions, algebraic/exponential
forcing, oscillation/resonance and substitutions. All 69 owner tasks retain
their keys, solutions, criteria and 655 marks across 135 parts. There are
20 independently authored examples and 40 complete-answer quick checks,
with variants and review. The source already contains the editorial replacements;
the importer does not repeat or invent those repairs. There are no source images.

Rebuild from the read-only source and the source audit:

    python scripts/content/prepare-fp2-ode.py --source 'E:\my folder\questions_data\original\Pure 2 9231\06_Differential_equations_9231_FP2_revised.json' --mapping docs/ARENA-C5-FP2-ODE-SOURCE-AUDIT-20261107.json
    python scripts/content/verify-fp2-ode.py --source 'E:\my folder\questions_data\original\Pure 2 9231\06_Differential_equations_9231_FP2_revised.json'
    python scripts/content/verify-fp2-ode.py --report .local/c5-fp2-ode-20261107/ci-math.json

CI needs no E: drive. Actual supplied TeX answers and original differential
equations are parsed, differentiated and checked by residuals and initial data.
Wronskians test independent homogeneous modes. Additional checks cover the
exceptional parameter, tank/observed models, implicit solutions, transformed
equations, positive radicals, the negative real cube-root branch, nonzero
reciprocal denominators, one-sided limits and periodic asymptotic responses.
Every numeric/polynomial short-answer field reconstructs a complete solution.
Printed-expression comparisons at 50-digit sample points are distinguished
from symbolic identities. External teacher review remains outstanding.

All 69 written tasks remain MANUAL paper self-study with indicative DRAFT
guidance. Short checks use the existing bounded exact parser, full coefficient
structures and complete root sets, not arbitrary transcendental equivalence.
No new migrations, dependencies, permissions or renderer changes are needed.
The guarded lifecycle preserves all seventeen older packages and restores this
one to DRAFT for browser QA. Final local publication is separate; repeat skips
109 tasks with zero writes. Production is outside this task.


## C5: Further Mechanics — Projectiles

The owner's next-course request authorises `9231-mechanics-projectiles` 1.0.0,
course `maths4u-9231-mechanics`, chapter `fm_projectiles`. Three lessons follow
the mathematical order of book 13.1–13.2, then connect meetings and stages.
Each has four independent worked examples, six SHORT checks and two MC checks
with variants/review, and nine owner written tasks. All 27 tasks (70 parts,
219 marks) retain the supplied keys and guidance. Criteria have no M/A codes
in this source; the projection leaves the code blank and retains text/marks.

Rebuild from the read-only source and source audit:

    python scripts/content/prepare-mechanics-projectiles.py --source 'E:\my folder\questions_data\original\Mechanics 9231\01_Projectiles_9231_Mechanics_revised.json' --mapping docs/ARENA-C5-MECHANICS-PROJECTILES-SOURCE-AUDIT-20261107.json --assets docs/ARENA-C5-MECHANICS-PROJECTILES-SOURCE-AUDIT-20261107.json
    python scripts/content/verify-mechanics-projectiles.py --source 'E:\my folder\questions_data\original\Mechanics 9231\01_Projectiles_9231_Mechanics_revised.json'
    python scripts/content/verify-mechanics-projectiles.py --report .local/c5-mechanics-projectiles-20261107/ci-math.json

CI needs no E: drive. Independent kinematic models verify complete component
states, both height/time roots, target-angle/time pairing, first-landing validity,
strict/inclusive wall boundaries, normal/tangential restitution, finite-barrier
recontact and pre-cut energy/tension. Actual TeX claims receive deterministic
50-digit comparisons, distinguished from symbolic proofs. External teacher
review remains outstanding. Every short field is independently recomputed.

Nine owner SVG diagrams are matched by article/alt/source path in the active
Teacher Review HTML, checked for external references and unsafe elements, and
converted to content-addressed PNGs: three STATEMENT, six SOLUTION. Existing
file grants and inline/gallery deduplication apply. Raw package/asset paths and
solution images stay hidden outside the authorised help boundary.

The four cross-topic tasks retain all supplied content. Q2/Q9/Q15 require
restitution; Q25 also requires circular-motion energy and radial force. These
prerequisites are explicit in the final lesson, with independent explanations.
No general bounding-parabola formula, new dependencies or migrations are added.
The guarded lifecycle preserves all eighteen preceding packages and restores
this one to DRAFT for browser QA. Final publication is local only. Repeat skips
51 tasks with zero writes. Production and other Mechanics chapters are outside
this task.
