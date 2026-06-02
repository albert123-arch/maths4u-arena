import { NextResponse } from "next/server";

import {
  noStoreHeaders,
  requireAdminForDiagnostics,
} from "@/lib/admin-diagnostics";
import {
  checkPrismaConnection,
  getSafeErrorCode,
  safeErrorMessage,
} from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminForDiagnostics();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    await checkPrismaConnection();

    return NextResponse.json(
      {
        ok: true,
        database: "prisma connected",
      },
      { headers: noStoreHeaders },
    );
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
      { status: 500, headers: noStoreHeaders },
    );
  }
}
