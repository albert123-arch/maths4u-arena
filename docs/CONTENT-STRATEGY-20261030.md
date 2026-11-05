# Maths4U Arena: authoring policy and readiness for AI review

Owner decision and read-only audit, 30 October 2026. This document does not deploy
features, change production data or enable an AI provider.

## Permanent content rule

Develop an independently authored Maths4U bank alongside the existing bank.
Author from the skill, objective, difficulty and constraints. Prepare the actual
question, data, context, diagrams, hints, worked solution and indicative marking
guidance independently. Standard methods and familiar question types are valid;
there is no requirement to invent a new mathematical idea or task type.
Changing a few words or numbers in a particular examination question is not a
sufficient authorship check. Keep borrowed elements and their provenance explicit.

The existing bank remains available while the complete planned original bank is
developed. Do not delete, hide, unpublish, restrict, redirect or bulk-noindex its
tasks as part of this transition. Preserve IDs, URLs, sources, files, versions,
assignments, attempts and reviews. Do not silently relabel legacy content as original.
After the new bank is complete, discuss the future of the old bank separately with
the owner; completion does not itself authorize removal. A concrete source issue
or rights request is a separate task, not a reason for speculative bulk removal.

The same owner policy is recorded for the PHP site in
`D:/www/AS&A level maths/AS-Alevel/docs/original_content_policy_20261030.txt`.
That file includes an authoring brief and acceptance checklist. Its SQL table names
belong to the PHP application; Arena retains its own model and isolated database.

## What was checked

- Public Arena catalogue and a live lesson, without starting or submitting work.
- Hostinger dashboard and phpMyAdmin for `u770916388_arena` through the owner's session.
- Read-only SELECT counts, current task/lesson versions and AI table columns.
- Local schema, grading, self-study and teacher-review code.
- Local HEAD and Hostinger's current deployment both identify
  `4ce27b477a67f90fa4cd52c5ef01fb25ad7e3092`.

No production mutations, migrations, imports, deployment or push were performed.
No accounts, student identities, answer contents or credentials were exported.
This was a content/architecture inspection, not a full functional or security audit.

## Current production content

The database has 59 tables. Exact SELECT counts, not estimated InnoDB row counts:

| Item | Count |
| --- | ---: |
| Courses | 6 |
| Chapters (Topic) | 42 |
| Topics (Lesson) | 214 |
| Tasks | 2674 |
| Task versions, including history | 2710 |
| Current task parts | 2705 |
| Lesson presentations | 59 |
| Attempts | 48 |
| Teacher reviews | 14 |
| AI suggestions | 0 |

| Course | Chapters | Topics | Tasks | Presentations |
| --- | ---: | ---: | ---: | ---: |
| Additional Mathematics 0606 | 16 | 97 | 1393 | 0 |
| Further Pure Mathematics 1 | 8 | 33 | 413 | 16 |
| Further Pure Mathematics 2 | 6 | 31 | 390 | 0 |
| Further Mechanics | 6 | 23 | 241 | 0 |
| Further Probability & Statistics | 5 | 29 | 217 | 43 |
| Book 2. Olympiad Number Theory Methods | 1 | 1 | 20 | 0 |

All 2674 current tasks are public and unarchived. These counts measure availability,
not mathematical correctness or independent authorship. School, IGCSE 0580 and
AS/A Level 9709 courses are not present in this database at this inspection date.
The PHP five-skill Quadratics pilot belongs to 9709 P1; do not assume its IDs or
course structure can be copied directly into Arena.

### Teaching content gaps

For the latest English lesson versions, 213 of 214 note fields are blank and all
214 worked-example fields are blank. The live Additional Mathematics lesson
“Maximum and minimum values of a quadratic function” displays no supplied notes
or worked examples, while retaining ten written/exam questions.

For current English task versions, detailed-solution fields are nonempty for 2674
tasks and short-answer fields for 2444. There are 2636 task versions with an MS
asset. Nonempty fields do not establish completeness or correctness of each solution.

There are 1264 nonempty MS transcripts: 14 marked SOURCE_TEXT and 1250 marked
OCR_UNVERIFIED. None is marked VERIFIED. All 2705 current task parts are MANUAL;
their English per-part rubric and answer fields are empty. Existing task-level
solutions/MS remain available; these gaps are not grounds to hide the bank.

## What already supports AI review

- TaskVersion and WorkItem preserve the actual task version assigned to a student.
- TaskPart has maximum points and PartText has a rubric field.
- Answer, AnswerFile and the review interface support written responses and files.
- Teacher Review contains points, feedback and a revision for conflict handling.
- AiSuggestion already stores answerId, provider, model, proposedPoints, feedback,
  externalData and createdAt separately from the answer and teacher review.
- File viewing, per-part navigation, work submission and result-release rules exist.

The current code has no AI provider/service writing AiSuggestion. Its production
table is empty. The schema is a foundation, not an enabled AI-checking feature.
Deterministic grading exists for CHOICE, NUMERIC and accepted short answers;
MANUAL returns no automatic mark. NUMERIC currently accepts decimal notation,
not the PHP pilot's full fraction/root-set input behavior.

An important existing boundary: new independent MANUAL practice is paper self-study.
Its UI/API do not accept new written submissions like teacher assignments do, and
self-checking is not a verified grade. AiSuggestion requires a saved Answer, so an
AI button cannot simply be attached to paper self-study without an input/storage
workflow. Preserve the existing guard until that workflow is explicitly designed.

## Planned content structure

1. Notes: independently authored explanations, conditions, three worked examples,
   common errors and a useful next step.
2. Practice: short original exercises, exact checking where appropriate and clear
   feedback; add verified fraction/equivalence behavior with meaningful tests.
3. Exam-style problems: independently authored multi-step questions with named
   criteria, maximum marks, acceptable alternative methods and complete solutions.
4. Worked solutions by paper: keep the paper/question reference, original link
   and independently written explanation distinguishable from official material.

Record provenance and review status without inventing an author, licence or teacher
review. MaterialCategory EXAM/TRAINING/OLYMPIAD does not by itself mean ORIGINAL.
Keep a shared editorial identity for original content delivered to both sites:
PHP problems and Arena Task/TaskVersion are separate application projections,
connected by explicit source/import mappings, not a merged database. A genuinely
new original problem gets a new identity; it does not overwrite an imported one.

## First AI pilot, after preparing the content

Start with a small, independently authored set, rather than enabling AI grading
over the whole imported bank. Define for each part: criterion ID, mathematical
requirement, maximum marks, alternative methods, partial credit and typical errors.
Check the examples and rubrics before using them as the grading reference.

The simplest initial path uses already submitted teacher assignments:

1. Freeze the submitted answer, files, task version and rubric version.
2. Request a criterion-by-criterion assessment from the configured provider.
3. Validate the structured proposal, mark limits and references to the student's
   actual work. Flag unreadable work and uncertain reasoning for human review.
4. Store the proposal in AiSuggestion with model/version/input identity. Repeated
   requests must not duplicate reviews or overwrite a teacher's later changes.
5. Let the teacher accept or edit the recommendation through the existing Review
   flow. Existing result-release rules continue to govern what a student sees.

A learner-facing AI-practice route is a separate next step: add an explicit way to
submit text/photo/PDF, preserve its revision and task context, and keep AI feedback
separate from self-check flags and published teacher marks. Do not bypass the
current ASSIGNMENT_REQUIRED/SELF_STUDY_NOT_GRADED guards globally.

Prepare synthetic correct, partially correct, incorrect, blank and unreadable
responses first. Evaluate mathematical feedback and partial credit against a
reviewed set before using real student work. Provider credentials, cost limits,
queueing and operational rollout are implementation work, not enabled by this audit.

## Next sequence

1. Preserve the existing public bank.
2. Prepare rich original notes/examples and an explicit skill mapping for Arena.
3. Add a small original exam-style set with reviewed per-part criteria.
4. Implement and evaluate the teacher-assistant AI pilot.
5. Design learner AI submissions and expand to more skills after validation.

Read-only SQL, anonymised aggregate results and an exact backup of the prior AGENTS
file are kept locally in `.local/content-policy-audit-20261030/`, outside Git.
