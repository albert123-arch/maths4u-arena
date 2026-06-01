# Maths4U Arena

Clean starter for the Maths4U Arena educational quiz/game platform.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- MySQL
- Node.js hosting target

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` with your MySQL credentials:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Project Structure

- `src/app/admin` - admin area route structure
- `src/app/play` - player route structure
- `src/app/host` - host route structure
- `src/app/api` - API route structure
- `src/components` - shared React components
- `src/lib` - shared TypeScript utilities
- `prisma` - Prisma schema and migrations

## Database Notes

The project is configured for MySQL through Prisma. No application models have been added yet.

When models are added later, use:

```bash
npm run prisma:migrate
```

## Hostinger Deployment Notes

1. Create a MySQL database and user in Hostinger hPanel.
2. Set `DATABASE_URL` with the Hostinger MySQL host, database name, username, and password.
3. Use a Node.js runtime compatible with this Next.js version. Node.js 20 or newer is recommended.
4. Install dependencies with `npm install`.
5. Build with `npm run build`.
6. Start with `npm run start` for a full project upload, or run `.next/standalone/server.js` if deploying the standalone build output.
7. Keep `.env` private on the server. Commit only `.env.example`.

This repository is intentionally limited to the starter setup. The full app features will be added later.
