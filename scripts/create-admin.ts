import { config } from "dotenv";
import { firstAdministrator, disconnectBootstrap } from "../src/lib/bootstrap-admin";
if (process.env.MATHS4U_ENV !== "production") config({ path: ".env.local", quiet: true });

async function main() {
  await firstAdministrator({ allowCreate: true, skipExisting: false });
  console.log("First administrator created. No credentials printed. Remove NEW_ADMIN_PASSWORD from your environment.");
}
main().catch(e => { console.error(e?.code || "Admin creation failed: check private environment and database configuration."); process.exitCode = 1; })
  .finally(() => disconnectBootstrap().catch(() => {}));
