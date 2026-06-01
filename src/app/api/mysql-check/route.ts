import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

import {
  getSafeMysqlErrorInfo,
  parseDatabaseUrlForConnection,
} from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
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

    return NextResponse.json({
      ok: true,
      database: "mysql2 connected",
    });
  } catch (error) {
    const safeError = getSafeMysqlErrorInfo(error);

    console.error("MySQL check failed", safeError);

    return NextResponse.json(
      {
        ok: false,
        database: "mysql2 failed",
        ...safeError,
      },
      { status: 500 },
    );
  } finally {
    if (connection) {
      await connection.end().catch(() => undefined);
    }
  }
}
