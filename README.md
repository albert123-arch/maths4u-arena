# Maths4U Arena

Full-stack MVP foundation for the Maths4U Arena educational quiz/game platform.

The current app includes the database schema, admin authentication, admin CRUD screens for tests and questions, classic student flow skeleton, host screen skeleton, and clean API route handlers. Advanced live game modes are intentionally left for later.

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
- `src/app/play` - student join screen
- `src/app/game/[code]` - student game skeleton
- `src/app/host/[code]` - host screen skeleton
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

## Hostinger Deployment Notes

1. Create a MySQL database and user in Hostinger hPanel.
2. Set database credentials as private server environment variables. You can use `DATABASE_URL`, or set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. If the `DB_*` variables are complete, the app uses them before `DATABASE_URL`.
3. Use a Node.js runtime compatible with this Next.js version. Node.js 20 or newer is recommended.
4. Install dependencies with `npm install`.
5. Run `npm run db:push` or deploy migrations once migration files are introduced.
6. Run `npm run prisma:seed` once to create the first admin.
7. Build with `npm run build`.
8. Start with `npm run start` for a full project upload, or run `.next/standalone/server.js` if deploying the standalone build output.
9. Keep `.env` private on the server. Commit only `.env.example`.
10. Use `/api/health` and `/api/db-check` only for temporary deployment diagnostics, then remove or restrict them after the database is confirmed.

Existing deployment target: `https://arena.maths4u.sbs`.
