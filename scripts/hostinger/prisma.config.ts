import path from "node:path";
import { defineConfig } from "prisma/config";
// The bundled validator rejects unconfirmed database targets. No dotenv fallback.
// @ts-expect-error setup.cjs is generated into the deployment artifact.
import { databaseConfig } from "./setup.cjs";
export default defineConfig({
  schema: path.resolve("prisma/schema.prisma"),
  migrations: { path: path.resolve("prisma/migrations") },
  datasource: { url: databaseConfig().raw },
});
