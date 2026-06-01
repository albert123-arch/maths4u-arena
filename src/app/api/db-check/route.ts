import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getDatabaseUrlInfo() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return {
      hasDatabaseUrl: false,
      databaseUrlHost: null,
      databaseName: null,
    };
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\/+/, "").split("/")[0];

    return {
      hasDatabaseUrl: true,
      databaseUrlHost: parsed.hostname || null,
      databaseName: databaseName ? decodeURIComponent(databaseName) : null,
    };
  } catch {
    return {
      hasDatabaseUrl: true,
      databaseUrlHost: null,
      databaseName: null,
    };
  }
}

function getStringProperty(error: unknown, key: string) {
  if (!error || typeof error !== "object" || !(key in error)) {
    return null;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getPrismaErrorCode(error: unknown): string | null {
  return (
    getStringProperty(error, "code") ??
    getStringProperty(
      error && typeof error === "object" ? (error as { cause?: unknown }).cause : null,
      "code",
    )
  );
}

function sanitizeErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const databaseUrl = process.env.DATABASE_URL;

  let message = rawMessage;

  if (databaseUrl) {
    message = message.replaceAll(databaseUrl, "[redacted DATABASE_URL]");

    try {
      const parsed = new URL(databaseUrl);

      if (parsed.username) {
        message = message.replaceAll(parsed.username, "[redacted user]");
      }

      if (parsed.password) {
        message = message.replaceAll(parsed.password, "[redacted password]");
      }
    } catch {
      // Ignore invalid DATABASE_URL parsing here; regex cleanup below still helps.
    }
  }

  return message
    .replace(/mysql:\/\/[^@\s]+@/gi, "mysql://[redacted]@")
    .replace(/for user\s+'[^']+'/gi, "for user '[redacted]'")
    .replace(/password\s*[:=]\s*[^,\s)]+/gi, "password=[redacted]")
    .slice(0, 300);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Database check timed out"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

export async function GET() {
  const databaseUrlInfo = getDatabaseUrlInfo();

  try {
    const { prisma } = await import("@/lib/prisma");

    await withTimeout(prisma.user.count(), 5_000);

    return NextResponse.json({
      ok: true,
      database: "connected",
      ...databaseUrlInfo,
      prismaErrorCode: null,
      prismaErrorMessageShort: null,
    });
  } catch (error) {
    console.error(
      "Database connection check failed",
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
        prismaErrorCode: getPrismaErrorCode(error),
        message: sanitizeErrorMessage(error),
      },
    );

    return NextResponse.json(
      {
        ok: false,
        database: "failed",
        ...databaseUrlInfo,
        prismaErrorCode: getPrismaErrorCode(error),
        prismaErrorMessageShort: sanitizeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
