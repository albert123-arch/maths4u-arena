import { NextResponse } from "next/server";

import {
  checkPrismaConnection,
  getSafeErrorCode,
  safeErrorMessage,
} from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkPrismaConnection();

    return NextResponse.json({
      ok: true,
      database: "prisma connected",
    });
  } catch (error) {
    const safeError = {
      code: getSafeErrorCode(error),
      message: safeErrorMessage(error),
    };

    console.error("Prisma check failed", safeError);

    return NextResponse.json(
      {
        ok: false,
        database: "prisma failed",
        ...safeError,
      },
      { status: 500 },
    );
  }
}
