import { NextResponse } from "next/server";

import { getDatabaseRedactionValues, getSafeDatabaseConfigInfo } from "@/lib/database-url";

export const dynamic = "force-dynamic";

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

  let message = rawMessage;

  for (const value of getDatabaseRedactionValues()) {
    message = message.replaceAll(value, "[redacted]");
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
  const databaseConfigInfo = getSafeDatabaseConfigInfo();

  try {
    const { prisma } = await import("@/lib/prisma");

    await withTimeout(prisma.user.count(), 5_000);

    return NextResponse.json({
      ok: true,
      database: "connected",
      ...databaseConfigInfo,
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
        ...databaseConfigInfo,
        prismaErrorCode: getPrismaErrorCode(error),
        prismaErrorMessageShort: sanitizeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
