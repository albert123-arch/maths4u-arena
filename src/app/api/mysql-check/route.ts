import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

import {
  noStoreHeaders,
  requireAdminForDiagnostics,
} from "@/lib/admin-diagnostics";
import {
  getSafeMysqlErrorInfo,
  parseDatabaseUrlForConnection,
} from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminForDiagnostics();

  if (unauthorized) {
    return unauthorized;
  }

  let connection: mysql.Connection | null = null;

  try {
    const databaseConfig = parseDatabaseUrlForConnection();

    if (!databaseConfig) {
      throw new Error("DATABASE_URL is missing or invalid.");
    }

    connection = await mysql.createConnection({
      ...databaseConfig,
      connectTimeout: 5_000,
    });

    await connection.query("SELECT 1 AS ok");

    return NextResponse.json(
      {
        ok: true,
        database: "mysql2 connected",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const safeError = getSafeMysqlErrorInfo(error);

    console.error("MySQL check failed", safeError);

    return NextResponse.json(
      {
        ok: false,
        database: "mysql2 failed",
        ...safeError,
      },
      { status: 500, headers: noStoreHeaders },
    );
  } finally {
    if (connection) {
      await connection.end().catch(() => undefined);
    }
  }
}
