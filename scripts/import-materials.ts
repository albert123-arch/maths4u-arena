import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { importMaterials } from "../src/lib/importer";
import { userSelect } from "../src/lib/security";
config({ path: ".env.local", quiet: true });
async function main() {
  const actor = await db().user.findUnique({ where: { username: process.env.IMPORT_ADMIN_USERNAME || "" }, select: userSelect });
  if (!actor) throw new Error("Set IMPORT_ADMIN_USERNAME to an existing administrator.");
  const file = process.argv[2];
  if (!file) throw new Error("Pass a JSON export path.");
  const bytes = await readFile(file);
  if (bytes.length > 2 * 1024 * 1024) throw new Error("Use a sample of at most 100 records and 2 MB.");
  console.log(await importMaterials(actor, JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""))));
}
main().catch(() => { console.error("Import failed. Check the JSON export, administrator and database configuration."); process.exitCode = 1; })
  .finally(() => db().$disconnect());
