import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../generated/prisma/client";
import { getConfiguredDatabaseConnectionConfig } from "./database-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseConfig = getConfiguredDatabaseConnectionConfig();

  if (!databaseConfig) {
    throw new Error("Database connection settings are required.");
  }

  const adapter = new PrismaMariaDb(databaseConfig);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    if (property === "then") {
      return undefined;
    }

    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
