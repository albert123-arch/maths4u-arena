import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { databaseConfig } from "../src/lib/database-url";
config({ path: ".env.local", quiet: true });

// Development migration tools may offer a reset. Never allow them against a
// deployment database, even when production credentials are explicitly present.
try {
  const target = databaseConfig();
  if (process.env.MATHS4U_ENV === "production" || !["127.0.0.1", "localhost"].includes(target.host)
    || !/^maths4u_dev(?:_|$)/.test(target.database)) {
    throw new Error("Development migrations require a dedicated local development database.");
  }
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "dev", ...process.argv.slice(2)], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} catch {
  console.error("Development migration refused. Check the local Maths4U development database configuration; production uses npm run db:migrate.");
  process.exitCode = 1;
}
