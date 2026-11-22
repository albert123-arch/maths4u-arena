# Arena implementation log

Local branch `audit/arena-learning-20261122`. The starting commit is `f94fd02a`. Releases and website observations are separate from local verification. The isolated preview at `http://127.0.0.1:3127` uses a rehearsal database already restored from an Arena backup.

## Stage 1 · Stabilise Review and question-support controls

Confirmed two live defects before editing. The Stage 9 investigation heading now has its own fragment, and `#review` remains the learning queue. Empty, hidden support panels now match their controls while closed. Resource fetching remains on demand.

Verification covers the exact conflicting fragment, unique DOM IDs, hidden and empty initial panels, keyboard activation, loaded guidance, collapse and focus at 390 and 1280 px.

Commit: `f3139571`, `Fix lesson Review anchors and support accessibility`.

## Stage 2 · Check course packages and repair worked examples

Checked 140 packages, 699 lessons, 8,825 interactive checkpoints and 24,744 bank questions. Independent verifiers ran for 9709 Pure 1 and Statistics 1, 9231 and four IGCSE chapters. The package checks and independent mathematical coverage are recorded separately in the [content review](arena-content-review.md).

Corrected incomplete or repeated worked examples in IGCSE recurring decimals, Additional Mathematics counting and series and Further Pure 2 hyperbolic graphs. Each edited example was checked on the isolated preview, including 390 and 1280 px and the corresponding A4 routes.

Commit: `2ae5d8cf`, `Repair incomplete and repeated worked examples`.

## Stage 3 · Retain practice and account destinations

Kept local return destinations on the account menu, signup and login forms, course sign-in and direct question practice and bookmark links. Protected routes keep their query and fragment. Plain course signups still take the learner to their dashboard once courses are chosen.

Notes, multiple choice, short answers and written practice now preserve `view=legacy`, filters and fragment. Changing modes clears pagination and the prior mode's pinned review task. The selected mode follows Back, Forward and reload. The chapter state follows navigation on older course routes too.

Six targeted unit tests passed. At 390 and 1280 px, the local browser verified mode switching, chapter changes, Back, Forward, reload and the auth destination. Mocked login and signup responses exercised the form submission return without writing new accounts. Earlier practice and revision returned HTTP 200 with the expected practice anchor or A4 controls.

Commit: `a5231f30`, `Preserve learning routes through sign-in and practice`.

## Stage 4 · Complete two missing prompts

Rewrote an incomplete vertical tangent prompt in 9231 FP2 and the AP/GP starter E04 in 9709 P1. Independently checked the tangent equation, AP and GP solutions and proof. On the local preview at 390 and 1280 px, the vertical tangent example expanded and E04 showed the three correctly weighted parts with its existing solution. Identifiers, marking criteria and quick checks remain compatible.

Commit: `9bc27e10`, `Make tangent and sequence prompts self-contained`.

## Stage 5 · Repair public discovery and crawl signals

Checked 51 representative live URLs and parsed the full sitemap. Public legacy aliases now point to the owning course and retain query state. Unsupported route suffixes return 404. Search ranks 9709 paper names and syllabus codes above lesson context matches. Course and directory metadata and share previews were updated.

Removed redundant reads in public discovery, language eligibility and catalogue counts. Ordered discovery output stayed identical for all 14 public courses and 705 lessons. Paired rehearsal timings fell from 57.0 s to 0.34 s and 42.1 s to 0.30 s for that database query. All nine complete catalogue payload comparisons matched across guest, student, teacher, admin and archive cases. The guest course directory median fell from 1.96 s to 1.60 s in that fixture. These are local query measurements.

Seven metadata and discovery tests, targeted ESLint and three browser scenarios passed, including 390 and 1280 px. The local and live sitemap URL sets matched exactly at 872, and all three Russian canonicals and alternates were confirmed. The [90-day growth plan](arena-seo-growth-plan.md) states how to measure organic discovery and learning completion. Search Console and field Core Web Vitals remain unavailable for the baseline.

Commit subject: `Improve Arena public discovery, search and crawl paths`. Next stage: reading and lesson progression.
