import { NextResponse } from "next/server";

import { getSafeDatabaseUrlInfo } from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function GET() {
  const databaseInfo = getSafeDatabaseUrlInfo();

  return NextResponse.json({
    ok: true,
    env: {
      hasDatabaseUrl: databaseInfo.hasDatabaseUrl,
      hasJwtSecret: hasValue("JWT_SECRET"),
      hasAppUrl: hasValue("APP_URL"),
      hasAdminEmail: hasValue("ADMIN_EMAIL"),
      databaseHost: databaseInfo.databaseHost,
      databaseName: databaseInfo.databaseName,
    },
  });
}
