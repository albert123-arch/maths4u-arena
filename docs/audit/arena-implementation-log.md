# Arena implementation log

Local branch `audit/arena-learning-20261122`. The starting commit is `f94fd02a`. Releases and website observations are separate from local verification. The isolated preview at `http://127.0.0.1:3127` uses a rehearsal database already restored from an Arena backup.

## Stage 1 · Stabilise Review and question-support controls

Confirmed two live defects before editing. The Stage 9 investigation heading now has its own fragment, and `#review` remains the learning queue. Empty, hidden support panels now match their controls while closed. Resource fetching remains on demand.

Verification covers the exact conflicting fragment, unique DOM IDs, hidden and empty initial panels, keyboard activation, loaded guidance, collapse and focus at 390 and 1280 px.

Commit subject: `Fix lesson Review anchors and support accessibility`. Next stage: auth handoff and legacy practice state.
