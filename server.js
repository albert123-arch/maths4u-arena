// Hostinger entrypoint delegates production startup to the gated dist server.
async function start() {
  const { existsSync } = await import("node:fs");
  if (process.env.MATHS4U_ENV === "production" || process.env.NODE_ENV === "production") {
    await import("./dist/server.js");
    return;
  }
  if (!process.env.MATHS4U_DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
  process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
  process.env.PORT = process.env.PORT || "3000";
  await import("./.next/standalone/server.js");
}
void start().catch(() => { console.error("[Maths4U] Startup failed; check the deployment artifact and private environment."); process.exitCode = 1; });
