# Arena quality audit

Audit date: 22 November 2026. Local starting point: `f94fd02a`. Live observations and tests on the isolated database are recorded separately.

## Architecture and scope

- Next.js with site and Russian-language catch-all routes, React learning and workspace components and a shared API dispatcher. Public metadata, robots and sitemap are generated from the public inventory.
- Prisma and MariaDB store lesson and task versions, course follows, learning evidence, assignments, answers and teacher reviews. Published package receipts select the precise active bank version. Teaching layouts, diagrams and exact-answer keys live under `content/original` and `public/assets`.
- The public lesson combines Notes, Examples, Practice, Exam-style and Review. Older practice, legacy bank routes and A4 views are separate entry points. Answer checking and resource access run through the existing server, with independent device and signed-in evidence.
- Live sitemap returned 872 entries and the homepage returned HTTP 200. The package registry contains 140 packages, 699 lesson IDs in 13 courses and 24,744 questions. Book 2 is served through a separate catalogue.
- Reviewed the roadmap, content policy, lesson standard, November teaching audit and its 0580 follow-up. The requested Reaudit filename was absent from the repository, Downloads and attachments. The November Codex audit ZIP contains `Arena_Codex_Backlog_2026-11-22.json`, coverage and sample evidence.

## Confirmed problems and acceptance

| ID | Live route or component | Evidence and impact | Local correction |
| --- | --- | --- | --- |
| AQ-01 | `/courses/maths4u-0862-stage-9/topics/lower-0862-s9-compare-and-question#review` | The live page contains two elements with `id=review`. The learning navigation, URL fragment and checkpoint recovery can land in a theory subsection instead of the learner's review queue. | Give the investigation section a distinct anchor. Keep the existing `#review` entry to the queue. |
| AQ-02 | `QuestionSupport` on Stage 9, Pure 1 and 0606 lessons | In HTML, Hint, Worked solution and Marking guidance point to missing IDs until opened. Keyboard and assistive-technology clients cannot resolve these controls in the initial state. | Keep empty hidden panels mounted, retain authorization and fetch content on demand. |
| AQ-03 | Login, account menu and legacy practice | Reproduced a lost `view=legacy#practice` when switching to short answers on the Pure 1 composite functions page. Account and bank sign-in links discarded the lesson or selected question. | Keep local return destinations with the query and fragment, preserve the current view and support Back and Forward across activity and chapter state. Account switches reuse the destination from the auth form. |
| AQ-04 | Legacy topic and malformed public URLs | A legacy Advanced GCD topic resolved with self-canonicals under unrelated and nonexistent course slugs. Malformed suffixes of topic and library routes returned indexable duplicates. | Verify a route's exact shape and resolve public aliases to their owning topic. |
| AQ-06 | Lesson navigation and 9709 Statistics 1 back-to-back diagrams | Navigation after Review stopped at the old work links. At 390 px the lesson put ten fitting equations in the tab order while a wide example table had no explicit focus target. | Link to the following lesson beside Review. Keep wide tables and display equations keyboard-scrollable when the content exceeds its available width. |
| AQ-07 | Programme search and public metadata | Code searches placed inherited matches before the course. The 51-route live guest sample had `og:title` without an image. | Rank syllabus codes and exact titles, announce each course once and add a shared preview image with descriptive page metadata. |
| AQ-09 | Public discovery, language availability and course catalogue | On the isolated database the course query rechecked public task criteria for the same lessons, and course catalogue selected an unused task count per lesson. English-only public shapes fetched all Russian availability. | Apply the same visibility test in the selected lessons, discard empty courses, skip provably unnecessary translation reads and remove the unused catalogue count. Verify complete role payloads and the Russian URL set. |

The older audit already recorded fixes to Stage 7 mixed numbers, the theory-checkpoint Review loop, programme discovery, 0580 graph activities and the prior 0606 bank. These are regression targets. The local calculus revision is a separate commit from the latest deployed release.

## Earlier audit reconciliation

| November ZIP IDs | Status and evidence |
| --- | --- |
| A01–A03 | The corrected force answer, checkpoint-to-Review loop and reproducible t-test are present. Ran existing answer and Review checks and re-ran independent 9231 inference verification. |
| A04–A08, A17, A19 | Previous stage fixed angle examples, practical graphs, views, rotations, data displays, probability trees and Pythagoras diagrams. This pass verified package assets and re-ran 0580 diagram and answer scripts. See the [teaching audit report](../ARENA-TEACHING-AUDIT-REPORT-20261122.md) for the individual diagrams and activities. |
| A09–A16, A20 | Previous stage corrected the sampled Further and 9709 diagrams and generated notation. No missing referenced assets or unrendered command fragments were found in the registry scan. Diagram interpretation and phrasing still need independent editorial review beyond the sampled items. |
| A18, A21 | The source has quantity- and age-dependent response guidance. Eight Stage 7 probability fields still had generic labels, now replaced with the actual quantities. Five Normal distribution topics have structured study sessions. Exact, rounded and mixed-number regressions passed. |
| A22 | Cambridge levels appear on the homepage. Browser navigation from the level selector through course and chapter to a real topic passed at both widths. |
| A23 | The Further Statistics preparation route was present but its Paper 6 match was too general. The follow-up identifies actual links and remaining preparation by syllabus section. |
| A24 | The four originally cited lessons now have distinct sample worked examples. Current registry scan found and corrected three other exact duplicate example prompts. Near-duplicate banks remain an editorial sampling item. |

See [execution backlog](arena-fix-backlog.md), [content review](arena-content-review.md), [SEO and growth](arena-seo-growth-plan.md) and [implementation history](arena-implementation-log.md).
