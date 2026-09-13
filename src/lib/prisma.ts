import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { databaseConfig } from "./database-url";

const globalDb = globalThis as unknown as { maths4uDb?: PrismaClient };
export function db(): PrismaClient {
  if (!globalDb.maths4uDb) {
    const config = databaseConfig();
    globalDb.maths4uDb = new PrismaClient({ adapter: new PrismaMariaDb({
      host: config.host, port: config.port, user: config.user, password: config.password, database: config.database,
      connectionLimit: config.connectionLimit, connectTimeout: config.connectTimeout, acquireTimeout: config.acquireTimeout,
    }) });
  }
  return globalDb.maths4uDb;
}
