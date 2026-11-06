<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:maths4u-content-policy -->

# Maths4U content policy — owner decision, 30 October 2026

Before changing educational content, read
[the content strategy and current audit](docs/CONTENT-STRATEGY-20261030.md).

- Build an independently authored Maths4U bank from skills and learning objectives,
  with original questions, diagrams, worked solutions and indicative marking criteria.
  Familiar mathematical methods and task types are valid starting points; do not
  require a new mathematical idea. Do not use mass paraphrasing of examination
  questions as evidence of independent authorship.
- Keep the existing bank available while the complete original bank is developed.
  Do not delete, unpublish, hide, restrict, redirect or bulk-noindex existing
  materials because of the redesign or the move toward original content. Later
  retirement requires a separate owner decision, even after the new bank is ready.
- **Owner decision, 6 November 2026 (this is that separate decision):** material
  classified as Cambridge examination content is archived, not deleted. Archived
  tasks, their versions and files are visible only to administrators; guests,
  students and teachers do not see them anywhere (catalogue, search, practice,
  assignments, files, sitemap). Records, IDs, versions, attempts, answers and
  reviews are preserved, and archiving must be reversible. Material that cannot
  be classified automatically stays as it is until the owner reviews it. Follow
  Stage 6 of `docs/CODEX-ARENA-ROADMAP-20261105.md`.
- Preserve task identities, sources, immutable versions, import mappings, work
  assignments, files, answers and reviews. Do not relabel imported tasks as original
  or put a new original problem over an unrelated existing Task identity.
- Arena's canonical model is Task / TaskVersion in its own database. The PHP site's
  problems table is not Arena's schema. For shared original content, preserve an
  editorial identity and explicit import mapping; do not merge the live databases.
- Keep Notes, Practice, original Exam-style problems and Worked solutions by paper
  distinguishable. Record provenance and actual verification. Maths4U's own marking
  criteria must not be presented as an official mark scheme.
- Keep student responses, deterministic autoPoints, teacher Review and AI proposals
  separate. AiSuggestion is a prepared data model, not a working AI integration.
  Preserve the current limits on paper self-study and assignment submission until
  an explicit replacement workflow is designed. Missing rubrics or unverified OCR
  do not authorize removing existing tasks.
- Current redesign work is local only: no push, deployment, production writes or
  real-student AI test calls unless the owner changes that scope. Preserve unrelated
  owner files, including output/ and tmp/.

<!-- END:maths4u-content-policy -->
