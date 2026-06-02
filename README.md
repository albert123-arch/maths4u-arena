# Maths4U Arena

Full-stack MVP foundation for the Maths4U Arena educational quiz/game platform.

The current app includes admin authentication, test/question management, classic guest sessions, QR join, host controls, student answering, results export, registered student accounts, and the first series/league workflow foundation. Advanced non-classic live modes are intentionally left for later.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- MySQL
- Node.js hosting target for Hostinger Business Web Hosting

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set the required values in `.env`:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
# Optional Hostinger-style alternative:
# DB_HOST="localhost"
# DB_PORT="3306"
# DB_USER="USER"
# DB_PASSWORD="PASSWORD"
# DB_NAME="DATABASE"
JWT_SECRET="replace-with-a-long-random-secret"
APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-this-password"
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply the schema to a MySQL database during MVP development:

```bash
npm run db:push
```

Create the first admin user:

```bash
npm run prisma:seed
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Scripts

- `npm run lint` - generate Prisma client and run ESLint
- `npm run build` - generate Prisma client and build Next.js
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - create/apply a Prisma migration locally
- `npm run prisma:seed` - create the first admin from env variables
- `npm run db:push` - push schema to MySQL without a migration file for early MVP hosting

## Project Structure

- `src/app/admin` - protected admin dashboard and CRUD pages
- `src/app/play` - guest and registered student join screen
- `src/app/student` - registered student login, dashboard, series, and results
- `src/app/game/[code]` - classic student game screen
- `src/app/host/[code]` - host lobby/live/results controls
- `src/app/api` - App Router API route handlers
- `src/components` - shared UI/client components
- `src/lib` - auth, Prisma, validation, grading, slug, and game-code utilities
- `prisma` - Prisma schema and seed script

## Database Notes

The schema is MySQL-compatible and includes:

- users with admin/teacher roles
- tests and versioned tests
- reusable question bank with options and grading rules
- game sessions, participants, answers, and score events
- registered student accounts
- multi-day series, registrations, rounds, and series scores

Flexible `LongText` JSON fields are used for future game modes and grading settings without requiring Redis, Docker, PostgreSQL, or paid external services.

## Manual MySQL Import With phpMyAdmin

If Hostinger cannot run Prisma commands during build, initialize the database manually:

1. Open Hostinger hPanel.
2. Open phpMyAdmin for the target MySQL database.
3. Select the database, for example `u770916388_arena2`.
4. Open the Import tab.
5. Upload and import `database/init_mysql.sql`.
6. Confirm that the tables were created.
7. Create the first admin user later.

Optional admin seed:

1. Generate a bcrypt hash locally for the admin password.
2. Open `database/seed_admin.sql`.
3. Replace `ADMIN_EMAIL_HERE` with the admin email.
4. Replace `PASSWORD_HASH_HERE` with the bcrypt hash.
5. Import `database/seed_admin.sql` in phpMyAdmin.

Never put a real password or real bcrypt hash into Git.

Additional manual migrations:

- Import `database/migrations/001_student_series.sql` to add registered student accounts and series/league tables.
- This migration is additive. It creates new tables and adds `Participant.studentAccountId`.
- Run it only after `database/init_mysql.sql` has already created the base MVP tables.
- Import `database/migrations/002_teacher_classes_library.sql` to add teacher classes, class memberships, and content ownership/library fields.
- This migration is additive. It creates `Classroom` and `ClassMembership`, adds owner/visibility fields to tests and questions, and keeps existing data.
- Run it after `database/migrations/001_student_series.sql` if you use class-only sessions with registered students.
- Import `database/migrations/003_assignments.sql` to add assignments, submissions, and assignment answers.
- This migration is additive. It creates `Assignment`, `AssignmentSubmission`, and `AssignmentAnswer`.
- Run it after `database/migrations/002_teacher_classes_library.sql` before using homework or controlled assignments.

Next planned feature: photo submissions with storage quotas. The current assignment UI includes placeholders only; uploads are not enabled yet.

## Manual Smoke Tests

### Classic Guest Session

1. Log in as an admin.
2. Open `/admin/tests` and make sure a test has a published version with questions.
3. Launch the published version as `Classic`.
4. Open the host screen and confirm the QR code and join link are visible.
5. Join from `/play?code=CODE` in another browser or mobile device.
6. Start the session, answer questions, and submit.
7. Finish the session from the host screen.
8. Open `/admin/sessions/CODE/results` and download the CSV.
9. Open `/game/CODE/results` as the participant and confirm personal results appear when enabled.

### Host-Paced Guest Session

1. Log in as an admin.
2. Open `/admin/tests` and launch a published version as `Host-paced`.
3. Set a question time limit, speed bonus, leaderboard visibility, and student results visibility in the launch modal.
4. Open `/host/CODE` and confirm the lobby, QR code, participant list, and `Presenter mode` link work.
5. Open `/host/CODE/present` on a display screen.
6. Join from `/play?code=CODE`.
7. Start the host-paced session and move through: lobby, starting, question, locked, reveal, leaderboard, next question, finish.
8. Confirm student answers stay stable while the page polls.
9. Confirm final leaderboard, personal results, and admin CSV download work.

### Team Mode Session

1. Launch a published test as `Classic` and choose `Team mode` in the launch modal.
2. Rename or add teams if needed, then choose `sum`, `average`, or `top3` team scoring.
3. Join from `/play?code=CODE`, choose a team, and confirm the host lobby shows team columns.
4. Start, answer, finish, and confirm `/admin/sessions/CODE/results` shows individual and team leaderboards.
5. Download the session CSV and confirm it includes team name, individual rank, team rank, score, correct count, and percentage.
6. Repeat the same check with a `Host-paced` session and confirm presenter mode shows team cards.
7. Series rounds can carry `teamMode` in round settings JSON; current series scoring remains individual. Full multi-round team league scoring is a TODO.

### Series Classic Round

After importing `database/migrations/001_student_series.sql`, use this flow to confirm the registered student and series foundation:

1. Log in as an admin.
2. Open `/admin/setup-check` and confirm the database connection, required tables, tests, published versions, students, and series checks.
3. Open `/admin/students` and create a student account with a username, display name, group, and password or PIN.
4. Open `/admin/series` and create a series.
5. Open the series detail page and register the student.
6. Make sure at least one test version is published from `/admin/tests`.
7. Add a round to the series using the published test version.
8. Launch the round as `Classic` and open the host screen.
9. Have the student log in from `/student/login`, join the live round, and play.
10. Finish the session from the host screen.
11. Open the admin results and the series leaderboard to confirm scores are recorded.

### Series Host-Paced Round

1. Complete the Series Classic setup through the student registration and round creation steps.
2. On the series detail page, choose `Host-paced` as the round launch mode.
3. Launch the round and open `/host/CODE`.
4. Have the registered student log in from `/student/login` and join the live round.
5. Run the host-paced flow through finish.
6. Confirm `/admin/sessions/CODE/results`, the student personal results page, and the series leaderboard include the score.
7. Use `Run again` only when you intentionally want the series round to point at a new session.

### Registered Series Join Access

1. Create or confirm an active student in `/admin/students`.
2. Register that student on `/admin/series/SERIES_ID`.
3. Launch a series round from the series detail page.
4. Open `/admin/sessions/CODE/access-check` and confirm the series, round, registered count, and joined count are correct.
5. Use the host QR or student link `/student/join/CODE`.
6. If the student is not logged in, confirm `/student/login?next=/student/join/CODE` redirects back after login.
7. Confirm the student joins as their registered display name, not as a guest.
8. Confirm `/admin/sessions/CODE/access-check` changes that student from not joined to joined.
9. If a student is missing, use the Access Check warnings before changing data in phpMyAdmin.

### Teacher, Class, And Library Foundation

After importing `database/migrations/002_teacher_classes_library.sql`, use this flow to confirm teacher access:

1. Log in as an admin.
2. Open `/admin/teachers` and create a teacher account with an email and temporary password.
3. Sign out, then sign in with the teacher account. The login should redirect to `/teacher`.
4. Open `/teacher/classes`, create a class, and copy or scan the join link from the class detail page.
5. Have a registered student log in and open `/join-class/CODE`.
6. Confirm the student appears on `/teacher/classes/CLASS_ID` and `/teacher/students`.
7. Open `/teacher/tests`, create a test, add or create questions, publish a draft version, then launch it.
8. Choose `Guest link` for an open session, or `Class-only link` and select a class for registered class access.
9. Confirm class-only sessions only allow students with active class membership.
10. Share a teacher test to the library from `/teacher/tests`.
11. As admin, open `/admin/library` and mark shared content as curated or archive it.
12. As another teacher, open `/teacher/library` and copy a public or curated test into private teacher content.

### Teacher Assignment Flow

After importing `database/migrations/003_assignments.sql`, use this flow to confirm homework and controlled assignments:

1. Log in as an admin and create a teacher.
2. Log in as that teacher and create a class.
3. Have a student join the class from `/join-class/CODE`.
4. Teacher creates or copies a test, attaches questions, and publishes a version.
5. Teacher opens `/teacher/assignments/new` and creates an assignment from the class and published version.
6. Teacher opens the assignment detail page and clicks `Assign`.
7. Student opens `/student`, sees the active assignment, and starts it.
8. Student answers questions and submits.
9. Teacher opens `/teacher/assignments/ASSIGNMENT_ID/results`.
10. Teacher reviews a submission, adds feedback or point overrides, and exports CSV.

## Hostinger Deployment Notes

1. Create a MySQL database and user in Hostinger hPanel.
2. Set database credentials as private server environment variables. You can use `DATABASE_URL`, or set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. If the `DB_*` variables are complete, the app uses them before `DATABASE_URL`.
3. Use a Node.js runtime compatible with this Next.js version. Node.js 20 or newer is recommended.
4. Install dependencies with `npm install`.
5. Apply database SQL manually in phpMyAdmin when production schema changes are needed.
6. Run `npm run prisma:seed` once locally or seed manually to create the first admin.
7. Build with `npm run build`.
8. Start with `npm run start` for a full project upload, or run `.next/standalone/server.js` if deploying the standalone build output.
9. Keep `.env` private on the server. Commit only `.env.example`.
10. Use `/api/ping` and `/api/health` for public deployment checks. Detailed diagnostics such as `/api/db-check`, `/api/env-check`, `/api/mysql-check`, `/api/prisma-check`, and `/api/runtime-check` are admin-only.
11. If deployed pages show old CSS or missing `_next/static` assets, clear Hostinger/browser cache or temporarily enable development mode in any CDN/proxy layer, then restart the Node.js app.

Existing deployment target: `https://arena.maths4u.sbs`.

## Release QA Before a Live Class

Use this short checklist after every production deploy:

1. Deploy the latest GitHub commit to Hostinger.
2. Restart the Node.js app.
3. Purge CDN/proxy/browser cache if pages show stale CSS or missing `_next/static` assets.
4. Open `/api/ping` and `/api/health`.
5. Log in as admin and open `/admin/qa`.
6. Launch one Classic session and test the host screen.
7. Launch one Host-paced session and test the presenter screen.
8. Scan the QR code on a phone and confirm `/play?code=CODE` pre-fills the code.
9. Join as one guest student and submit at least one answer.
10. For registered rounds, log in as one student and confirm series access.
11. Finish the session and confirm personal results.
12. Download session results CSV and series leaderboard CSV.
