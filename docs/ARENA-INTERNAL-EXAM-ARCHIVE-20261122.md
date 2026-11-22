# Internal Exam Archive

## Topic navigation

In Topicwise, **Open Questions** under **Practice Questions** shows the author's questions for the topic and links to interactive practice when available. **Open Problems** under **Exam-Style Problems** shows the matching past-paper questions. The topic overview links to lesson notes where available. Past Papers retains the syllabus, year, session and variant navigation.

The archive uses existing topic links, checked aliases and approved question placements. The source export has 54 past-paper questions for *Solving modulus inequalities* and no past-paper question matching *The modulus function*. Both topics have 11 author-written questions.

## Local import

Rehearsed against the isolated local database with 11,825 legacy source rows and 11,364 existing canonical archive questions. The new table holds complete statements and solutions, with question and part numbering from the source. Figure and mark scheme references point to maths4u.sbs. The old site serves these files and controls access to their original addresses.

```text
npx tsx scripts/exam-archive-internal-import.mts --source <export-directory> --legacy-resources <private-media-index> --env-file <test-env>
npx tsx scripts/exam-archive-internal-import.mts --source <export-directory> --legacy-resources <private-media-index> --env-file <test-env> --apply <dry-run-hash>
```

Apply the schema migration to the isolated database before running these commands. The importer matches source IDs, paper references and printed parts to the existing archive. It inserts missing rows in one transaction and rejects a conflicting existing row. The immediate repeat read back the same data and inserted zero rows. The source export and media index stay outside Git.

## Verification

- Exercised both topic activities at 390 and 1280 px in the local browser.
- Opened an imported question, solution, figure and mark scheme reference. Verified denied access for guests, accounts without a grant and requests outside the granted syllabus. Revocation blocked subsequent question and solution requests.
- Compared row counts in 21 protected tables against the pre-import baseline, including tasks, task versions, assignments, answers and learning progress.
- The rendering scan found legacy math markup errors in six statements and sixteen solutions. These retain the source wording and link to the legacy entry.

The local rehearsal was performed on 22 November 2026. Deployment and production content transfer are separate operations.
