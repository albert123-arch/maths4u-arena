import { config } from "dotenv";
import { db } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { digest, passwordSchema, usernameSchema, transaction } from "../src/lib/security";
import { ensure } from "../src/lib/errors";
config({ path: ".env.local", quiet: true });

async function main() {
  const username = usernameSchema.parse(process.env.NEW_ADMIN_USERNAME);
  const password = passwordSchema.parse(process.env.NEW_ADMIN_PASSWORD);
  const displayName = process.env.NEW_ADMIN_NAME?.trim() || "Maths4U Administrator";
  ensure(displayName.length <= 160, 400, "INVALID_NAME");
  const passwordHash = await hashPassword(password);
  await transaction(async tx => {
    // The singleton row lock is released at COMMIT, not before it. Concurrent
    // bootstrap processes must observe the first administrator once committed.
    await tx.$executeRawUnsafe("INSERT INTO RateLimit (`key`, count, expiresAt) VALUES (?, 0, ?) ON DUPLICATE KEY UPDATE count = count",
      digest("system:first-admin"), new Date("2099-01-01T00:00:00Z"));
    ensure(await tx.userRole.count({ where: { role: "ADMIN" } }) === 0, 409, "ADMIN_ALREADY_EXISTS_USE_ADMIN_PANEL");
    await tx.user.create({ data: { username, displayName, passwordHash, roles: { create: { role: "ADMIN" } }, profile: { create: { locale: "ru" } } } });
  });
  console.log("First administrator created. No credentials printed. Remove NEW_ADMIN_PASSWORD from your environment.");
}
main().catch(e => { console.error(e?.code || "Admin creation failed: check private environment and database configuration."); process.exitCode = 1; })
  .finally(() => db().$disconnect());
