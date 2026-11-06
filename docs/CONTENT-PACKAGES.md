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
