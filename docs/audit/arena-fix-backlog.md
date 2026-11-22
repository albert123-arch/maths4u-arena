# Arena execution backlog

| Priority | ID | Scope and student impact | Acceptance | Status |
| --- | --- | --- | --- | --- |
| High | AQ-01 | Stage 9 Review link lands on the wrong section because of a duplicate ID. | Unique fragment, working fallback from an incorrect theory answer, desktop and mobile. | Fixed locally in `f3139571` |
| High | AQ-02 | Shared question support has dangling control IDs for closed panels. | All three targets exist, gated resources load on demand, keyboard focus stays on the invoking button. | Fixed locally in `f3139571` |
| High | AQ-03 | Login and registration lose the intended learning URL. Legacy mode changes discard the current view and practice state. | Explicit safe next, guest-to-student resume, MC/SHORT/WRITTEN, revision and legacy compatibility with old saved work. | Auth and practice stage |
| High | AQ-04 | Legacy topic aliases and malformed paths create duplicate or misleading public pages. | Correct owning course and canonical, genuine 404 for unsupported route suffixes, useful URLs remain discoverable. | Public discovery stage |
| High | AQ-05a–c | Incomplete or repeated worked examples in 0580, 0606 and 9231 FP2. Learners lack an option list or see the same decision twice. | Complete prompts and independently checked worked steps. Assessments and keys remain compatible. | Fixed locally in the content stage |
| Medium | AQ-06 | Check reading, practice and next-topic journey at 390 and 1280 px, with keyboard, equations and tables. | Reproduce and fix user-visible problems on representative routes before expanding layout. | In progress |
| Medium | AQ-07 | Define 90-day discovery and learning experiments. | Search Console baseline and consented measurement with documented denominators, public chapter and topic quality gates. | Growth stage |
| Medium | AQ-08 | Independent editorial checks across the complete bank, including diagram usefulness, mathematical conditions and near-duplicates. | Compare each lesson with its syllabus objective, reason through the solution and record any corrections to stable versions. | Registry-wide automated checks complete. Editorial coverage is sampled. |

Reconcile earlier findings by evidence. Do not re-implement already functioning Stage 7 mixed-number checks, 0606 calculus or original content correction packages. See [audit evidence](arena-quality-audit.md) and [implementation history](arena-implementation-log.md).
