import "dotenv/config";

import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";
import { readNewAdminInput } from "./admin-input";

async function main() {
  const input = readNewAdminInput();
  const passwordHash = await hashPassword(input.password);
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: input.name,
        passwordHash,
        role: "ADMIN",
      },
    });

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    console.log(`Admin account updated: ${input.email}`);
    console.log(`Total admin accounts: ${adminCount}`);
    return;
  }

  await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: "ADMIN",
    },
  });

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  console.log(`Admin account created: ${input.email}`);
  console.log(`Total admin accounts: ${adminCount}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin creation failed.");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
