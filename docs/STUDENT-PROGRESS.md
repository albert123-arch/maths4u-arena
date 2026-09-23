# Class student progress

Open **Teaching → My classes → your class → Progress & answers** beside a student.

The page includes the student's independent practice, including practice they started before joining the class, and assignments you set for this class. It shows attempt totals, active and finished attempts, graded work, topics marked as read, help usage, self-checks and tasks marked for another attempt. History has activity/topic filters and pages of 20 attempts. The topic summary uses the latest independent attempt for each task in that topic, so retries do not inflate the count. Practice started directly from the problem bank remains in the history even without a topic.

Open **Answers & review** to inspect a submitted independent answer, its images/PDFs, solutions and MS. Marks and comments use the existing review mechanism and become visible to the student immediately. Teacher viewing does not reveal help to the student or modify their self-check state. Concurrent reviews retain the existing revision conflict checks. Student drafts remain unavailable to class teachers until submission or timeout.

Access is checked on the server for the progress list, individual attempts, marking and original/preview/thumbnail file downloads. The teacher must own an active class with an active membership for that student. Removing the student or archiving the class revokes this new access; another active class with the same teacher can still grant access. An administrator retains their existing privileges. Private assignments and olympiad entries belonging to other teachers are not added to this permission. Existing assignment ownership, result release and source-hiding rules remain in place.

No database migration is required. `tests/student-progress-fixture.ts` runs within the isolated populated-database suite (`PILOT_LOCAL_TEST=1` with `tests/pilot-migration.test.ts` locally), covering permissions, file access, feedback, repeated attempts, pagination, course filters, membership removal and class archival. It does not use production data or credentials.
