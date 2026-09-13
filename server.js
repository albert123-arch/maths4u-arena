// Ordinary Node entrypoint for Hostinger. The generated standalone server owns HTTP.
const fs = require("node:fs");
if (!process.env.MATHS4U_DATABASE_URL && fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";
void import("./.next/standalone/server.js");
