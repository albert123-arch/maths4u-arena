# Provenance, quarantine and editorial versions

Owner decision: Stage 6b, 6 November 2026. These instructions do not authorise a deployment or production mutation.

**Release D update, 6 November:** the historical Stage 6b manual-executor checklist below is superseded for the first Arena D deployment by the reviewed, gated runtime procedure in [HOSTINGER.md](HOSTINGER.md) and [ARENA-RELEASE-D-REPORT-20261106.md](ARENA-RELEASE-D-REPORT-20261106.md). Production was not contacted or mutated during preparation. The old local-only scripts retain their guards; they are not repurposed by changing environment flags. Release D has a separate startup coordinator, a deterministic data migration, database policy backups, a private dry-run journal and an atomic authored-content import.

## Access rules

- Non-administrators see a task only if its existing visibility/entitlement rules allow it, it is not archived, its origin is not UNKNOWN, and it is ORIGINAL or manually approved by the owner.
- UNKNOWN stays hidden even when someone manually marks it UNKNOWN. A category or a source name is never owner approval.
- Importers classify all newly created/revised tasks centrally. Confirmed Cambridge examination provenance is immediately archived; other imported tasks remain UNKNOWN. Existing manual origin decisions are preserved. Re-importing an unchanged task cannot approve it.
- The previously approved 668 original tasks remain available. The owner's 20 Book 2 olympiad tasks have manual ORIGINAL classification. The ten local demonstrations have manual DEMO classification and an administrator-only archive.
- `Task.examArchivedAt` is retained for compatibility and now also covers the Demo archive. The UI derives “Archived · Demo” from DEMO provenance; other archived examination material uses “Archived · Cambridge”. This field's name must not be treated as authorship evidence.
- Restoring an archive does not by itself approve an UNKNOWN/unreviewed task. A manual Cambridge classification archives by default. Release D additionally retains H1's historical-version restriction: clearing an archive flag or relabelling origin cannot expose a task with an exact Cambridge source/board. Changing that protection requires a separate code/policy decision.
- Administrators can review individual tasks or a whole applied `admin/bank/*` task batch. Batch operations require a reviewed fingerprint, recheck every row, retain existing archives, and write a private restoration journal before the transaction. A bulk origin change is not an automatic archive restoration.

## Local Stage 6b data operation

Use the canonical checkout `D:\www\arena` and the already configured `.local/content-bank/runtime.json`. Never run `scripts/bank/run-local.mjs` to resume this work: it creates a different database. Never transfer these test databases or QA accounts to production.

```powershell
# Dry-run only; no --apply means no database mutation.
& '.local/node22/node.exe' scripts/bank/with-local.mjs node_modules/tsx/dist/cli.mjs scripts/content-stage6b.ts --report .local/stage6b-20261106/review.json

# Only after reviewing the exact IDs and version plan:
& '.local/node22/node.exe' scripts/bank/with-local.mjs node_modules/tsx/dist/cli.mjs scripts/content-stage6b.ts --apply --actor LOCAL_ADMIN_ID --journal .local/stage6b-20261106/NEW-UNIQUE-JOURNAL.json --report .local/stage6b-20261106/result.json

# Inspect restoration, without writing:
& '.local/node22/node.exe' scripts/bank/with-local.mjs node_modules/tsx/dist/cli.mjs scripts/content-stage6b.ts --restore --journal .local/stage6b-20261106/final.json --report .local/stage6b-20261106/restore-review.json
```

Restoration requires the same journal and `--restore --apply --actor LOCAL_ADMIN_ID`. It refuses a different database, a changed policy decision, a changed current version or a changed import hash. Old task/lesson versions are never deleted: restoring content appends inverse versions of the original payload. The journal records before/after/inverse version IDs. Successful rollback restores effective content and provenance, rather than pretending that historical rows never existed. Audit rows remain.

The journal is created exclusively before the transaction, with preassigned new version IDs and import hashes. `PREPARED` plus matching committed IDs can recover the narrow interval after commit and before writing `APPLIED`. A rolled-back/incomplete transaction is not mistaken for an applied one. Retain the journal; do not reuse its path.

The original 516 tasks receive new TaskVersion records; only the approved title/statement wrappers change. All other scalars, hints, answers, solutions, rubrics, criteria, marks, options, files, source references and editorial status are copied unchanged and compared. Re-import hashes are updated reversibly so repeat imports remain idempotent. There are 51 legacy note rows in 50 lessons; one is historical. Only the 50 current lessons get new versions, with their previous versions preserved.

Bulk-origin journals are stored outside the public tree at `PRIVATE_STORAGE_PATH/content-policy-journals/UUID.json`. Local reverse entry point:

```powershell
& '.local/node22/node.exe' scripts/bank/with-local.mjs node_modules/tsx/dist/cli.mjs scripts/restore-content-batch.ts --journal ABSOLUTE_PRIVATE_JOURNAL_PATH
# Add --apply --actor LOCAL_ADMIN_ID only for an explicit local restoration.
```

Do not expose private journal paths or contents through a public file endpoint.

## First-deployment checklist — separate future owner command

1. Record the accepted commit, target environment and current production counts. Back up the production database and private source files; verify that the backup can be restored. Keep its identifier with the reviewed migration plan.
2. Test migrations and the provenance policy on staging. Include the session-view migration, Stage 6 archive fields and the additive DEMO enum migration. Never import the local QA database.
3. On the server, a **read-only** production classification mode is available. Use the server's existing protected `MATHS4U_ENV=production`, `MATHS4U_DATABASE_URL` and matching `MATHS4U_DATABASE_NAME`; do not paste secrets into commands or reports:

   ```powershell
   node node_modules/tsx/dist/cli.mjs scripts/content-policy.ts --production-report --mode classify --report PRIVATE_REVIEW_REPORT_PATH
   ```

   `--production-report` rejects `--apply` and archive/restore modes before opening the database. It has been tested with a production environment flag against an isolated local database only. No production connection was made for Stage 6b.
4. Compare the fresh production report with the accepted owner decisions. Do not assume local Task IDs, counts or current versions equal production. Match the 20 confirmed olympiad questions and ten demonstrations using explicit source/import identities; review conflicts and unknown sources.
5. Obtain a **separate owner command** for production writes after the backup and reviewed dry-run. The current mutation scripts intentionally remain local-only. A later production executor must validate the backup and plan fingerprint, journal the actual production IDs and versions, and provide the tested inverse operation. Do not bypass the local guard by editing an environment variable or reusing a local journal.
6. That future executor must separately apply: Cambridge archival; the 20 authorship marks; the Demo archive; new textual TaskVersion/LessonVersion records. Re-run role/file/history/default-import tests. Preserve attempts, answers, reviews, keys, marking criteria and points. A rollback of wrappers appends inverse versions.
7. Check `MATHS4U_ENV=production`, indexing, canonical/hreflang, robots/sitemap, English cookie independence, RU availability, sign-in, viewing lenses and protected files after an authorised deployment.

The 59 teacher presentation references mentioned in the earlier production audit remain outside this stage's changes. A separate teacher entry to hidden Cambridge topics needs another owner decision. No presentations are moved, exposed or reclassified here.
