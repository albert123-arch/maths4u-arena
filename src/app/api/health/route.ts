import { NextResponse } from "next/server";

import { getSafeDatabaseConfigInfo } from "@/lib/database-url";

export async function GET() {
  const databaseConfigInfo = getSafeDatabaseConfigInfo();

  return NextResponse.json({
    ok: true,
    env: {
      hasDatabaseUrl: databaseConfigInfo.hasDatabaseUrl,
      hasDbHost: databaseConfigInfo.hasDbHost,
      hasDbUser: databaseConfigInfo.hasDbUser,
      hasDbPassword: databaseConfigInfo.hasDbPassword,
      hasDbName: databaseConfigInfo.hasDbName,
      databaseUrlSource: databaseConfigInfo.databaseUrlSource,
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasAppUrl: Boolean(process.env.APP_URL),
      hasAdminEmail: Boolean(process.env.ADMIN_EMAIL),
    },
  });
}
