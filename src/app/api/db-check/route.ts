import { NextResponse } from "next/server";

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
  try {
    const { prisma } = await import("@/lib/prisma");

    await withTimeout(prisma.user.count(), 5_000);

    return NextResponse.json({
      ok: true,
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Database connection check failed",
      error instanceof Error ? error.name : "UnknownError",
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Database connection failed",
      },
      { status: 500 },
    );
  }
}
