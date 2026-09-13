import "dotenv/config";
import { auditStorage, retryDeletedCleanup } from "../src/lib/storage-maintenance";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
try {
  databaseConfig();
  if(process.argv.slice(2).some(a=>!["--audit","--retry-deleted"].includes(a))) throw new Error();
  console.log(JSON.stringify(process.argv.includes("--retry-deleted") ? await retryDeletedCleanup() : await auditStorage()));
} catch { console.error("STORAGE_MAINTENANCE_FAILED; private configuration and file paths were not logged."); process.exitCode=1; }
finally { await db().$disconnect(); }
