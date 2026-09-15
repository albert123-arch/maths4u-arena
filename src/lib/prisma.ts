import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { databaseConfig } from "./database-url";

const globalDb = globalThis as unknown as { maths4uDb?: PrismaClient };
export function db(): PrismaClient {
  if (process.env.MATHS4U_BUILD === "1") throw new Error("Database access is disabled during builds.");
  if (!globalDb.maths4uDb) {
    const config = databaseConfig();
    globalDb.maths4uDb = new PrismaClient({ adapter: new PrismaMariaDb({
      host: config.host, port: config.port, user: config.user, password: config.password, database: config.database,
      // Match the existing migrations, independent of Hostinger's server default.
      collation: "UTF8MB4_UNICODE_CI",
      connectionLimit: config.connectionLimit, connectTimeout: config.connectTimeout, acquireTimeout: config.acquireTimeout,
    }) });
  }
  return globalDb.maths4uDb;
}
