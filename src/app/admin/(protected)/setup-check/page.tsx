import { isAssignmentsMigrationError } from "@/lib/assignments";
import { isStudentSeriesMigrationError } from "@/lib/migration-warning";
import { messages } from "@/lib/messages";
import { safeErrorMessage } from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

type PrismaClient = typeof import("@/lib/prisma")["prisma"];

type Tone = "ok" | "warn" | "bad";

type CountCheck = {
  label: string;
  value: string;
  tone: Tone;
  detail?: string;
};

const requiredSeriesTables = [
  "StudentAccount",
  "Series",
  "SeriesRound",
  "SeriesRegistration",
  "SeriesScore",
  "Assignment",
  "AssignmentSubmission",
  "AssignmentAnswer",
];

const diagnosticRoutes = [
  { route: "/api/ping", access: messages.setup.public, status: messages.setup.publicSafe },
  { route: "/api/health", access: messages.setup.public, status: messages.setup.publicSafe },
  { route: "/api/db-check", access: messages.setup.adminOnly, status: messages.setup.ok },
  { route: "/api/env-check", access: messages.setup.adminOnly, status: messages.setup.ok },
  { route: "/api/mysql-check", access: messages.setup.adminOnly, status: messages.setup.ok },
  { route: "/api/prisma-check", access: messages.setup.adminOnly, status: messages.setup.ok },
  { route: "/api/runtime-check", access: messages.setup.adminOnly, status: messages.setup.ok },
];

async function withPrisma<T>(operation: (client: PrismaClient) => Promise<T>) {
  const { prisma } = await import("@/lib/prisma");

  return operation(prisma);
}

async function getDatabaseConnectionCheck() {
  try {
    await withPrisma((client) => client.$queryRaw`SELECT 1 AS ok`);

    return {
      tone: "ok" as const,
      status: messages.setup.connected,
      detail: messages.setup.ok,
    };
  } catch (error) {
    console.error("Setup database check failed", {
      message: safeErrorMessage(error),
    });

    return {
      tone: "bad" as const,
      status: messages.setup.failed,
      detail: "Database connection failed.",
    };
  }
}

async function getRequiredTableCheck(tableName: string) {
  try {
    const rows = await withPrisma((client) =>
      client.$queryRawUnsafe<Array<{ tableName: string }>>(
        "SELECT TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
        tableName,
      ),
    );

    return {
      name: tableName,
      exists: rows.length > 0,
    };
  } catch (error) {
    console.error("Setup table check failed", {
      tableName,
      message: safeErrorMessage(error),
    });

    return {
      name: tableName,
      exists: false,
    };
  }
}

async function getCountCheck(
  label: string,
  count: (client: PrismaClient) => Promise<number>,
): Promise<CountCheck> {
  try {
    const value = await withPrisma(count);

    return {
      label,
      value: String(value),
      tone: "ok",
    };
  } catch (error) {
    console.error("Setup count check failed", {
      label,
      message: safeErrorMessage(error),
    });

    return {
      label,
      value: messages.setup.failed,
      tone: "bad",
      detail: isAssignmentsMigrationError(error)
        ? messages.api.assignmentMigrationRequired
        : isStudentSeriesMigrationError(error)
          ? messages.api.migrationRequired
          : messages.api.unknownError,
    };
  }
}

function getToneClass(tone: Tone) {
  if (tone === "ok") {
    return "bg-teal-50 text-teal-800 ring-teal-200";
  }

  if (tone === "warn") {
    return "bg-amber-50 text-amber-900 ring-amber-200";
  }

  return "bg-red-50 text-red-800 ring-red-200";
}

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${getToneClass(tone)}`}>
      {label}
    </span>
  );
}

export default async function AdminSetupCheckPage() {
  const [databaseCheck, tableChecks, countChecks] = await Promise.all([
    getDatabaseConnectionCheck(),
    Promise.all(requiredSeriesTables.map((tableName) => getRequiredTableCheck(tableName))),
    Promise.all([
      getCountCheck(messages.setup.tests, (client) => client.test.count()),
      getCountCheck(messages.setup.publishedVersions, (client) =>
        client.testVersion.count({ where: { status: "PUBLISHED" } }),
      ),
      getCountCheck(messages.setup.students, (client) => client.studentAccount.count()),
      getCountCheck(messages.setup.series, (client) => client.series.count()),
      getCountCheck("Assignments", (client) => client.assignment.count()),
    ]),
  ]);
  const missingTables = tableChecks.filter((table) => !table.exists);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">{messages.setup.title}</h1>
        <p className="mt-2 text-slate-600">{messages.setup.description}</p>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{messages.setup.databaseConnection}</h2>
            <p className="mt-1 text-sm text-slate-600">{databaseCheck.detail}</p>
          </div>
          <StatusBadge label={databaseCheck.status} tone={databaseCheck.tone} />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{messages.setup.adminLoginStatus}</h2>
            <p className="mt-1 text-sm text-slate-600">{messages.setup.signedIn}</p>
          </div>
          <StatusBadge label={messages.setup.ok} tone="ok" />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{messages.setup.requiredTables}</h2>
          <StatusBadge
            label={missingTables.length === 0 ? messages.setup.available : messages.setup.missing}
            tone={missingTables.length === 0 ? "ok" : "bad"}
          />
        </div>
        {missingTables.length > 0 ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            {missingTables.some((table) => table.name.startsWith("Assignment"))
              ? messages.api.assignmentMigrationRequired
              : messages.api.migrationRequired}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {tableChecks.map((table) => (
            <div
              key={table.name}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm"
            >
              <span className="font-medium">{table.name}</span>
              <StatusBadge
                label={table.exists ? messages.setup.available : messages.setup.missing}
                tone={table.exists ? "ok" : "bad"}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">{messages.setup.contentCounts}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {countChecks.map((check) => (
            <div key={check.label} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">{check.label}</span>
                <StatusBadge label={check.tone === "ok" ? messages.setup.ok : check.value} tone={check.tone} />
              </div>
              <p className="mt-2 text-2xl font-bold">{check.value}</p>
              {check.detail ? <p className="mt-1 text-sm text-slate-600">{check.detail}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-semibold">{messages.setup.debugRoutes}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {messages.setup.publicSafe} routes expose no secret values.
          </p>
        </div>
        <div className="divide-y divide-slate-200">
          {diagnosticRoutes.map((route) => (
            <div
              key={route.route}
              className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_160px_160px] sm:items-center"
            >
              <span className="font-medium">{route.route}</span>
              <span className="text-slate-600">{route.access}</span>
              <span className="text-slate-600">{route.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
