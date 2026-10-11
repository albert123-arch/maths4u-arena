# Personal learning and dashboards

The user authorized publication on 11 October 2026. The home page shows followed courses for signed-in users, with Choose courses leading to the complete catalog. Guests can browse all published courses. Following a course does not grant subscription access.

- Course → chapter → topic navigation offers Notes & examples, Multiple Choice, Short Answer and Written / Exam practice. Classification uses all parts of the latest task version. Mixed questions use written practice.
- MC and short answers are checked inline and retain server-checked results. Answers and solutions require explicit reveal.
- Independent written practice uses paper, explicit solution/MS reveal, and solved/not solved or self-awarded points. Self assessment stays in PracticeStudy, never Answer/Review or official scores. Reopening a current self-study record allows updating the assessment without duplicate activities.
- The server rejects written answer saves/submissions and answer-file uploads for independent practice, including the compatibility practice route. Teacher assignments still accept typed solutions, photos/PDF and teacher grades. Previously submitted answers, files and marks remain readable under their existing access rules.
- Bookmarks use the stable task ID, survive new task versions and are private to each account. The bookmark list respects task/archive/access permissions. Removal and course selection accept an explicit desired state, making retries safe.
- Student dashboard shows selected courses and course progress, homework, bookmarks and topic history. Teacher dashboard links to class progress and individual histories. Teachers see self-reported solved status/points separately from checked answers. Other teachers’ assignments and removed memberships remain protected.
- Admin navigation and APIs require ADMIN. English is the default; existing account preferences and the RU switch remain available.

## Migration and deployment

`202610110001_personal_learning` adds CourseFollow, TaskBookmark and nullable self-assessment fields, plus selfDirected defaulting to false for historical study records. It does not reset content or rewrite existing grades. Existing users choose their courses via All courses → Add to my courses.

`npm run build` still creates `dist/server.js`. Hostinger runtime migration, SHA256 checks and engine execution-permission repair remain unchanged. No production credentials are needed to build. The existing automatic deployment from main applies the additive migration before serving APIs.

The Linux/Node.js 22 workflow also runs on main and codex/personal-learning, using its disposable MySQL service and no production secrets. Validate the exact commit on the verification branch before advancing main.

## Local preview and verification

Preview: <http://127.0.0.1:3108>. Local-only users: preview_student, preview_teacher, preview_admin. No preview credentials or database exports are shipped.

Practice preview: MC & Short Answer contains 4 MC, 5 short-answer and 1 written synthetic exercise. It is only in the isolated local bank; this change does not import demo questions or additional legacy content. The five real 0606/9231 courses and olympiad pilot remain available.

Private runtime, fixture setup, sessions and screenshots live under ignored .local. Browser suite: `playwright.learning.config.ts`; attachment suite can use the local preview configuration under .local. Phone browser tests emulate iPhone/WebKit and Android; they do not confirm a physical handset.

Populated migration tests seed the preceding schema, snapshot every existing column including password hashes, grades and historical study records, apply the new migration twice, and verify preservation. API tests cover independent-submission denial, assigned uploads/grading, bookmark/version/archive isolation, follows without access grants, and teacher/student progress privacy. Hostinger package tests use a fresh explicitly configured loopback database to check migrations and redeployment.
