# Arena administrator workspace visibility hotfix

Date: 7 November 2026. Scope: `arena.maths4u.sbs`, repository `maths4u-arena`.
The PHP site `maths4u.sbs`, its files and database are outside this change.

## Cause and change

The affected administrator session had successfully loaded its content. In the
owner's Chrome browser, `.ad-sidebar` and `.ad-main` both had computed
`display: none` and zero-size rectangles, while the latter still contained the
`Platform administration` heading. The header and footer were visible. The app's
stylesheets do not hide the main element. This identifies a cosmetic-filter
collision with the new advertising-like CSS names; the registration workflow is
not the cause. No particular extension or filter list was identified or disabled.

Rename all 483 `ad-*` class/ID references to `arena-admin-*` consistently in:

- `src/app/admin-dashboard.css`
- `src/components/admin-dashboard.tsx`
- `src/components/admin-screen.tsx`
- `src/components/admin-task-reports.tsx`

An independent inverse-prefix comparison reproduces the previous four files
exactly after normalising their existing checkout line endings. CSS declarations,
specificity, handlers, ARIA references and focus restoration are preserved.
There are no API, permission, role, schema, task, progress or import changes.
No production SQL or account modifications are part of this hotfix.

## Local verification

- Full source ESLint passed, with only the owner's unrelated `tmp/` and `output/`
  directories excluded. Neither directory is staged or sent.
- TypeScript passed.
- The Webpack production build and distributable audit passed (24,497 files;
  private environment files, fixtures and detected credentials excluded).
- New `tests/ux-browser/admin-cosmetic-filter.spec.ts`: four cases passed at
  1280/390 px in light/dark themes against the development build. Each covers
  overview, decisions, users, reports, teacher submissions and content tools.
- The test explicitly mocks API transport, not the React components, stylesheet
  loading or browser layout. A pre-hydration cosmetic-filter stylesheet hides
  the former `ad-*` names. A positive-control element confirms the filter is
  active; the renamed workspace remains visible. Checks include computed CSS,
  nonzero rectangles, mobile overflow, report dialog/image and restored focus.
- The same four cases passed against the standalone production build at
  `http://127.0.0.1:3109` (12.2 seconds), using only the guarded loopback test
  environment. No production credentials or database are used for these tests.
- Application commit: `35557dc3c3d339884cefe1132dfc33e5376cc85e` (five files,
  including the new browser regression).
- The prior docs-only acceptance commit `9ab5ffb` is an ancestor. Unrelated owner
  changes and generated files are excluded; no broad staging was used.
- Live baseline before rollout: health 200, 2,928 public tasks, guest admin 401.

## Release acceptance

Full Linux release CI
[42401635599](https://github.com/albert123-arch/maths4u-arena/actions/runs/42401635599)
passed on the exact application SHA (all 24 steps, including standalone startup,
migrations and repeat deployment). Main was re-fetched and remained at the
expected `8b008b1` before promotion; the verified SHA was sent by normal
fast-forward push, without force. The automatic main CI
[42402332623](https://github.com/albert123-arch/maths4u-arena/actions/runs/42402332623)
also completed successfully on the same SHA, including its repeat-deployment test.

Hostinger deployment `01a1b74e-9867-73af-bcdf-91b441437e33` is **Completed /
Current**, for Arena's `maths4u-arena` main only, exact SHA `35557dc`. Node 22.x;
build 1m 22s, publication 18.1s, restart 11.5s, total 2m 50s. The first immediate
page reload briefly returned the startup response; health then became 200 / ok
and the subsequent normal reload loaded the complete workspace.

Verified in the owner's affected Chrome session, with its filtering unchanged:

- Sidebar: `display: block`, rectangle 220 × 880.4 px.
- Main workspace: `display: block`, rectangle 1228.8 × 2473.85 px.
- No legacy advertising-like `ad-*` classes remain in the rendered page.
- Overview, teacher submissions, question reports and users/roles render and
  navigate normally. The final page was returned to the admin overview.
- Actual counters: 2,928 public tasks, Unclassified 0, Cambridge archive 2,654,
  presentations 59. Existing accounts were only viewed; no roles, access or
  account records were edited or archived.
- A separate unauthenticated, read-only scan passed: all 59 catalogue pages,
  2,928 distinct public tasks, no Cambridge source entries, health 200 and all
  four checked admin API endpoints 401.

Accepted production SHA is recorded in
`.local/admin-visibility-hotfix-20261107/accepted-production-sha.txt`.
Before/after screenshots: `live-before.jpg` and `live-after.jpg` in the same
private evidence directory. This report and the roadmap are recorded locally
after acceptance, without triggering another deployment for documentation.

Private evidence is kept under `.local/admin-visibility-hotfix-20261107/` and
browser screenshots under `test-results/admin-cosmetic-filter-20261107/`.
Neither location is committed.
