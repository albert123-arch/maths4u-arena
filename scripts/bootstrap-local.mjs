import fs from "node:fs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
const secrets = JSON.parse(fs.readFileSync(".local/db-secrets.json", "utf8").replace(/^\uFEFF/, ""));
const connection = await mysql.createConnection({ host: "127.0.0.1", port: 33317, user: "root", password: secrets.rootPassword });
const existing = fs.existsSync(".env.local");
if (existing) throw new Error(".env.local exists; refusing to replace it. Reuse the existing configuration.");
const appPassword = crypto.randomBytes(32).toString("hex");
for (const name of ["maths4u_dev", "maths4u_test"]) {
  const [rows] = await connection.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?", [name]);
  if (rows.length) throw new Error("Target database already exists; refusing bootstrap.");
}
await connection.query("CREATE DATABASE maths4u_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
await connection.query("CREATE DATABASE maths4u_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
await connection.query("CREATE USER 'maths4u_local'@'127.0.0.1' IDENTIFIED BY ?", [appPassword]);
await connection.query("GRANT ALL ON maths4u_dev.* TO 'maths4u_local'@'127.0.0.1'");
await connection.query("GRANT ALL ON maths4u_test.* TO 'maths4u_local'@'127.0.0.1'");
const url = "mysql://maths4u_local:" + appPassword + "@127.0.0.1:33317/";
fs.writeFileSync(".env.local", 'MATHS4U_DATABASE_URL="' + url + 'maths4u_dev"\nMATHS4U_DATABASE_NAME="maths4u_dev"\nMATHS4U_ENV="development"\nAPP_URL="http://localhost:3000"\nPRIVATE_STORAGE_PATH="D:/www/arena/storage/private"\n');
fs.writeFileSync(".local/test.env", 'MATHS4U_DATABASE_URL="' + url + 'maths4u_test"\nMATHS4U_DATABASE_NAME="maths4u_test"\nMATHS4U_ENV="test"\nAPP_URL="http://localhost:3000"\nPRIVATE_STORAGE_PATH="D:/www/arena/.local/test-files"\n');
await connection.end();
console.log("Created separate development and test databases; private configuration saved without displaying credentials.");

