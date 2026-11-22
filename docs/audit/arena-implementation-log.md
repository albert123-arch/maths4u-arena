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

Six targeted unit tests passed. At 390 and 1280 px, the local browser verified mode switching, Back, Forward, reload and the auth destination. Mocked login and signup responses exercised the form submission return without writing test accounts. The local preview retained the original lesson and practice IDs.

Commit subject: `Preserve learning routes through sign-in and practice`. Next stage: reading and lesson progression.
