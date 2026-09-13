import { db } from "./prisma";
import { hashPassword } from "./password";
import { digest, passwordSchema, usernameSchema, transaction } from "./security";
import { ensure } from "./errors";

export async function firstAdministrator(options: { allowCreate: boolean; skipExisting: boolean }) {
  return transaction(async tx => {
    const key = digest("system:first-admin");
    await tx.$executeRawUnsafe("INSERT INTO RateLimit (`key`, count, expiresAt) VALUES (?, 0, ?) ON DUPLICATE KEY UPDATE count = count",
      key, new Date("2099-01-01T00:00:00Z"));
    if (await tx.userRole.count({ where: { role: "ADMIN" } })) {
      ensure(options.skipExisting, 409, "ADMIN_ALREADY_EXISTS_USE_ADMIN_PANEL");
      await tx.rateLimit.update({ where: { key }, data: { count: 1 } });
      return "existing administrator retained";
    }
    const marker = await tx.rateLimit.findUniqueOrThrow({ where: { key } });
    ensure(marker.count === 0, 409, "ADMIN_BOOTSTRAP_ALREADY_COMPLETED");
    ensure(options.allowCreate, 503, "FIRST_ADMIN_REQUIRED");
    const username = usernameSchema.parse(process.env.NEW_ADMIN_USERNAME);
    const password = passwordSchema.parse(process.env.NEW_ADMIN_PASSWORD);
    const displayName = process.env.NEW_ADMIN_NAME?.trim() || "Maths4U Administrator";
    ensure(displayName.length > 0 && displayName.length <= 160, 400, "INVALID_NAME");
    // Never promote or overwrite an account which registered the same username.
    ensure(!await tx.user.findUnique({ where: { username } }), 409, "ADMIN_USERNAME_ALREADY_EXISTS");
    await tx.user.create({ data: { username, displayName, passwordHash: await hashPassword(password),
      roles: { create: { role: "ADMIN" } }, profile: { create: { locale: "ru" } } } });
    await tx.rateLimit.update({ where: { key }, data: { count: 1 } });
    return "first administrator created";
  });
}

export async function disconnectBootstrap() { await db().$disconnect(); }
