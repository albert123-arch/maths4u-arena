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

## Series Smoke Test

After importing `database/migrations/001_student_series.sql`, use this flow to confirm the registered student and series foundation:

1. Log in as an admin.
2. Open `/admin/setup-check` and confirm the database connection, required tables, tests, published versions, students, and series checks.
3. Open `/admin/students` and create a student account with a username, display name, group, and password or PIN.
4. Open `/admin/series` and create a series.
5. Open the series detail page and register the student.
6. Make sure at least one test version is published from `/admin/tests`.
7. Add a round to the series using the published test version.
8. Launch the round and open the host screen.
9. Have the student log in from `/student/login`, join the live round, and play.
10. Finish the session from the host screen.
11. Open the admin results and the series leaderboard to confirm scores are recorded.

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

Existing deployment target: `https://arena.maths4u.sbs`.
