# Arena restricted exam archive release

Target production site `arena.maths4u.sbs`. Production database `u770916388_arena`. Scope authorised on 22 November 2026. The release branch starts at `89a32e2f` and contains the archive schema, permissions, screens and metadata tools.

## Archive coverage

| Programme | Papers | Indexed questions | Linked existing archive versions |
| --- | ---: | ---: | ---: |
| 0580 Extended | 222 | 3,882 | 0 |
| 0606 | 124 | 1,393 | 1,393 |
| 9231 | 149 | 1,261 | 1,261 |
| 9709 | 618 | 4,828 | 0 |
| Total | 1,113 | 11,364 | 2,654 |

The archived papers have 11,537 question placements and 11,825 original source records. Historical paper labels and secondary placements are retained. Two ambiguous secondary placements remain absent from navigation and their original references remain recorded. Topicwise reads the current Arena syllabus hierarchy for the authored bank and links verified old topic mappings. The source snapshot covers IGCSE 0580 Extended.

The transport holds metadata and official Cambridge links. Imported approval flags default to false. Student grant rights stay separate from rights to distribute individual exam statements, diagrams and schemes. The authorized viewer displays Maths4U-authored questions directly from the canonical bank.

## Rehearsal and backup

- Verified API scope, expiry, revocation, authorized diagram `GET`, `HEAD`, `Range`, disallowed generic file access, protected cache headers and sitemap exclusions. Tested an approved synthetic fixture and removed it after rehearsal.
- Edge at 390 and 1440 px verified Topicwise, the four programme cards, year/session navigation, paper rows, question references and admin grant and revoke. All 21 targeted tests passed. The rehearsed metadata import repeated with zero new rows. Preserve all legacy IDs.
- Verified the fresh compressed SQL backup from phpMyAdmin at 22:03 Tashkent. It contained 71 tables, all protected tables and the end-of-export transaction marker. The backup remains in `.local/exam-archive-20261122/`; SHA-256 `4da99911bcc6a8b55f9ffe4a07e566f5ce8836fe904c6a72463c942612ba6852`.
- Production metadata fingerprint `49ca11f6a19ac3839bb9033c2776e1a26e73abb6506371ab9e5784b3024292ec`. Use the generator and PHPMyAdmin with partial import disabled. A rehearsal against the wrong target verified a no-op.

## Compatibility

The production runtime requires a recognized Prisma migration history. If recovery is necessary after schema application, preserve `20261122150000_restricted_exam_archive` unchanged. The local `rollback/exam-archive-compatible-20261122` branch keeps the prior application and the same migration. The archive metadata update is additive and does not rewrite existing lessons, tasks, bank permissions or student data.

## Production verification

- GitHub Linux CI [run 45047806245](https://github.com/albert123-arch/maths4u-arena/actions/runs/45047806245) succeeded for `81804fee40854fde098994311ff06503abc25a7e`. The exact SHA fast-forwarded `main`. Hostinger reported the same commit as Current and Completed. Runtime recorded Prisma deployment status 0 and application readiness.
- The selected phpMyAdmin database was `u770916388_arena`. The asserted preview succeeded through 282 statements. Its final statement would fail if the database check, migration, source version links or collision checks failed. The checked apply package completed 298 statements. Partial import was disabled for both.
- The independent live database readback matched all four paper and question counts above, with 2,654 existing version links, 11,537 placements, 11,825 references, and zero content permission flags and student grants. The 15 protected table counts matched the fresh backup. They include 28,088 tasks, 32,128 task versions, 55 assignments, 57 attempts, 48 answers, 16 reviews, 11 learning progress records and 59 presentations.
- Live `/api/health` returned 200. As a guest the archive page only displayed a sign-in gate with noindex, and `/api/exam-archive` returned 404 and no-store. The public catalogue returned 25,432 tasks. The sitemap returned 872 URLs and no archive entry. The authenticated grant and paper flows were exercised against the local rehearsal with synthetic users.
