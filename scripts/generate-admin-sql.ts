import "dotenv/config";

import { randomUUID } from "node:crypto";

import { hashPassword } from "../src/lib/password";
import { readNewAdminInput } from "./admin-input";

function sqlString(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

async function main() {
  const input = readNewAdminInput();
  const id = `admin_${randomUUID().replace(/-/g, "")}`;
  const passwordHash = await hashPassword(input.password);

  console.log(`-- Generated Maths4U Arena admin SQL.`);
  console.log(`-- Import this in phpMyAdmin if direct database access is not available.`);
  console.log(`-- The raw password is not included in this file.`);
  console.log("");
  console.log("INSERT INTO `User` (");
  console.log("  `id`,");
  console.log("  `email`,");
  console.log("  `passwordHash`,");
  console.log("  `name`,");
  console.log("  `role`,");
  console.log("  `createdAt`,");
  console.log("  `updatedAt`");
  console.log(") VALUES (");
  console.log(`  ${sqlString(id)},`);
  console.log(`  ${sqlString(input.email)},`);
  console.log(`  ${sqlString(passwordHash)},`);
  console.log(`  ${sqlString(input.name)},`);
  console.log("  'ADMIN',");
  console.log("  CURRENT_TIMESTAMP(3),");
  console.log("  CURRENT_TIMESTAMP(3)");
  console.log(")");
  console.log("ON DUPLICATE KEY UPDATE");
  console.log("  `passwordHash` = VALUES(`passwordHash`),");
  console.log("  `name` = VALUES(`name`),");
  console.log("  `role` = 'ADMIN',");
  console.log("  `updatedAt` = CURRENT_TIMESTAMP(3);");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin SQL generation failed.");
  process.exit(1);
});
