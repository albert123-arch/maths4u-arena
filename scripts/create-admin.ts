import { config } from "dotenv";
import { db } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { passwordSchema, usernameSchema, transaction } from "../src/lib/security";
import { ensure } from "../src/lib/errors";
config({ path: ".env.local", quiet: true });

async function main() {
  const username = usernameSchema.parse(process.env.NEW_ADMIN_USERNAME);
  const password = passwordSchema.parse(process.env.NEW_ADMIN_PASSWORD);
  const displayName = process.env.NEW_ADMIN_NAME?.trim() || "Maths4U Administrator";
  ensure(displayName.length <= 160, 400, "INVALID_NAME");
  const passwordHash = await hashPassword(password);
  await transaction(async tx => {
    const rows = await tx.$queryRawUnsafe<Array<{ acquired: number }>>("SELECT GET_LOCK('maths4u_first_admin', 5) AS acquired");
    ensure(Number(rows[0].acquired) === 1, 409, "ADMIN_SETUP_BUSY");
    try {
      ensure(await tx.userRole.count({ where: { role: "ADMIN" } }) === 0, 409, "ADMIN_ALREADY_EXISTS_USE_ADMIN_PANEL");
      await tx.user.create({ data: { username, displayName, passwordHash, roles: { create: { role: "ADMIN" } }, profile: { create: { locale: "ru" } } } });
    } finally { await tx.$queryRawUnsafe("SELECT RELEASE_LOCK('maths4u_first_admin')"); }
  });
  console.log("First administrator created. No credentials printed. Remove NEW_ADMIN_PASSWORD from your environment.");
}
main().catch(e => { console.error(e?.code || "Admin creation failed: check private environment and database configuration."); process.exitCode = 1; })
  .finally(() => db().$disconnect());
