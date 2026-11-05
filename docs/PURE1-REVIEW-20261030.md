# Pure 1 review from short-practice results — local stage

Implemented locally in the two canonical applications. No push, deployment,
production SQL, new examination questions or changes to the old bank.

## Behaviour

Both home pages have a **Review · Pure 1** section. It lists up to four skills,
prioritising checks due now, missed answers and skills needing consolidation.
Cards explain the next step and link to the existing notes and short practice.
An empty state invites the learner to try a skill; no sample results are assigned
to the owner or real students just to populate the home page.

The queue uses the 208 original short checks across the current 50 skill briefs.
Untested skills are not labelled weak. One question retried several times still
counts as one checked question within its skill.

| Evidence | Next review |
| --- | --- |
| A valid checked answer is wrong | Due immediately |
| First unaided correct answer, or recovery from a mistake | After 1 day |
| Unaided success when the check is due | After 3, then 7, then 14 days |
| Further due successes | Interval remains capped at 14 days |
| Correct answer with a hint/answer/solution opened for that attempt | Check again without help; no spaced-success streak earned |
| Early repeat, including help use or later recovery | Does not advance the spaced streak or postpone an earlier planned review |

Intervals are elapsed 24-hour days, stored/calculated as UTC milliseconds and
displayed in the browser's local date. An earlier error remains consolidation
evidence until the learner completes a later unaided due check. The queue is
formative guidance from a small practice set, not a complete mastery assessment.

PHP review mode highlights the skill by displaying its due checks. If none is
due, the learner can practise the next scheduled check early. It shows when
today's review is complete. Ordinary skill pages and all bank routes remain
available. Arena opens the correct MC/Short Answer tab and highlights the exact
check. It clears stale search/progress filters for that review link, so a saved
solved-only filter cannot hide a missed target.

## Preserving marks and identity

PHP retains the existing first-attempt record and mark. Additional checked
outcomes are stored in the new `pure1_review_checks` table for scheduling only:
user, canonical question, editorial version, correctness, help use and UTC time.
It stores no submitted answer text. Existing first attempts are read as baseline
evidence without bulk backfill or edits. Both the new short API and the general
practice API record new original checks in this history. Hints and solutions
amend only the new review evidence associated with that session's check.

Guest PHP review is device-local and reuses the existing UID/version storage
keys, preserving their old correctness flag while adding dated review state.
An old wrong flag can still suggest a retry; an old correct flag without a date
is preserved without inventing a past check date or a success streak. Guest and
account storage are separate. Account recommendations use server history, so a
correct retry is reflected on another device even when the first mark was wrong.
Guest data is never silently merged into account marks.

Arena computes the schedule read-only from existing own PracticeStudy attempts
and deterministic autoPoints. No Arena schema or grade writes were added.
It includes only completed, automatically graded personal short checks from the
current original versions, with valid original lesson links and current access.
Legacy practice, in-progress work, teacher assignments, MANUAL paper self-study,
teacher Review and AiSuggestion are not reclassified or used as new auto-results.
Archived/private/unavailable material is excluded from these suggestions.

The authenticated Arena endpoint always uses its session actor; query parameters
cannot select another student's history. Guests retain the existing sign-in
requirement for answering in Arena. PHP guests receive no account review data.
All personalised responses use private/no-store caching.

The JS scheduling policy is byte-identical in the two repositories; PHP has the
same server reducer. Shared, explicit timeline fixtures verify their agreement.
Reading the home page does not mutate progress or manufacture an attempt.

## Local files and migration

- PHP home: `/`; practice: `/original_practice.php?block=functions&skill=inverse&review=1`.
- PHP read-only own-state endpoint: `/api/pure1_review.php`.
- Arena home: `/`; own review endpoint: `/api/learning/pure1-review`.
- Shared browser policy: `js/pure1-review-policy.mjs` and Arena's
  `src/lib/pure1-review-policy.mjs` with its TypeScript declaration.
- PHP migration: `database/migrations/2026_10_30_pure1_review_checks.sql`.
  Local installer: `scripts/install_pure1_review_local.php`, explicitly fenced to
  loopback port 33071 and `maths4u_current_20261030`.

The additive PHP migration was applied only to the local database. Any future
release must apply that migration before enabling detailed review tracking.
Keep its data if disabling the UI later; dropping review history is not a rollback
of an ordinary display change. No production release was requested or performed.

## Verification

- Twelve explicit policy timelines cover immediate errors, tomorrow/3/7/14-day
  intervals, the cap, recovery, help, early repeats, out-of-order input and the
  inclusive due-time boundary. Queue tests also verify grouping, weak recovery
  and selection of the missed target rather than another answer type.
- PHP review tests pass 20 assertions, with disposable users and transactional
  rollback. Existing 2,301 short-practice assertions, answer-checker tests,
  guided Quadratics and SEO checks pass.
- Six Arena test groups pass: scheduling policy, real personal-practice review,
  original short practice, original block preservation, Quadratics and diagrams.
  Integration checks use disposable users and existing read-only content; they
  exclude unrelated legacy and MANUAL study and verify actor isolation.
- Independent headless browser QA passes guest wrong/right review, dated and
  undated storage, PHP account retry history across two independent sessions,
  general-API evidence, Arena target links despite stale filters, answer/reload
  persistence, anonymous isolation, and eight mobile/desktop layout checks at
  390/1440 px. No foreground windows or the owner's browser were controlled.
- TypeScript, targeted ESLint, PHP syntax and whitespace checks pass.
- Before/after checksums and counts match for all **59 pre-existing PHP tables**
  and all **59 Arena tables**, including banks, attempts, assignments and versions.
  Only the additive PHP review table is new. Disposable fixtures were cleaned up;
  the owner's existing browser/device state and local DB connection shim remain.

Private proof files, exact code checkpoints and screenshots are in
`club-import-work/pure1-review-20261030` and Arena's `.local/pure1-review`.
The whole sites were not copied, committed or pushed.

Next: teacher review of the learning materials and interval suitability, then
additional short variants based on observed errors. This scheduler reuses the
current questions; it does not claim new independent variants or verified mastery.
