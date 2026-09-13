import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { databaseConfig } from "../../src/lib/database-url";
import { privateStorageRoot } from "../../src/lib/storage-config";
import { firstAdministrator, disconnectBootstrap } from "../../src/lib/bootstrap-admin";
import { childDiagnostic, errorCode } from "./diagnostics";

export { databaseConfig };

export async function prepareRuntime(root: string) {
  let stage = "configuration";
  let connection: Awaited<ReturnType<typeof mysql.createConnection>> | undefined;
  try {
    if (process.env.MATHS4U_ENV !== "production") throw new Error();
    if (process.env.MATHS4U_BUILD) throw new Error();
    const origin = new URL(process.env.APP_URL || "");
    if (origin.protocol !== "https:" || origin.origin !== process.env.APP_URL || origin.username || origin.password) throw new Error();
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "hostinger-build.json"), "utf8"));
    if (manifest.platform !== process.platform || manifest.arch !== process.arch) throw new Error();
    if (!/^node_modules\/@prisma\/engines\/schema-engine-[a-zA-Z0-9.-]+$/.test(manifest.engine)
      || !fs.existsSync(path.join(root, manifest.engine))) throw new Error();
    const target = databaseConfig();
    const port = process.env.PORT || "3000";
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error();
    process.env.PORT = port;
    process.env.HOSTNAME = "0.0.0.0";
    Object.assign(process.env, { NODE_ENV: "production" });

    stage = "private storage";
    const storage = privateStorageRoot(root);
    fs.mkdirSync(storage, { recursive: true, mode: 0o700 });
    const probe = path.join(storage, ".maths4u-storage-probe");
    let preserved = false;
    try { fs.writeFileSync(probe, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; preserved = true; }
    const probeData = fs.readFileSync(probe);
    if (!/^[a-f0-9]{64}$/.test(probeData.toString("utf8"))) throw new Error();
    // Separately test current write permission even when the persistent probe exists.
    const writeProbe = path.join(storage, ".write-" + randomBytes(12).toString("hex"));
    try { fs.writeFileSync(writeProbe, "ok", { flag: "wx", mode: 0o600 }); if (fs.readFileSync(writeProbe, "utf8") !== "ok") throw new Error(); }
    finally { if (fs.existsSync(writeProbe)) fs.unlinkSync(writeProbe); }
    console.log("[Maths4U] Storage probe " + (preserved ? "preserved" : "created") + "; SHA256=" + createHash("sha256").update(probeData).digest("hex"));

    stage = "database connection";
    connection = await mysql.createConnection({ host: target.host, port: target.port, user: target.user, password: target.password,
      database: target.database, connectTimeout: 10000 });
    const lock = "maths4u-deploy-" + createHash("sha256").update(target.database).digest("hex").slice(0, 40);
    stage = "deployment lock";
    const [lockRows] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK(?, 30) AS acquired", [lock]);
    if (Number(lockRows[0].acquired) !== 1) throw new Error();
    const [tables] = await connection.query<RowDataPacket[]>("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [target.database]);
    if (tables.length && !tables.some(table => table.name === "_prisma_migrations")) { stage = "database must be empty or Prisma-managed"; throw new Error(); }
    stage = "Maths4U migration history";
    const migrationDirectory = path.join(root, "prisma/migrations");
    const expectedMigrations = new Map(fs.readdirSync(migrationDirectory, { withFileTypes: true })
      .filter(entry => entry.isDirectory()).map(entry => [entry.name,
        createHash("sha256").update(fs.readFileSync(path.join(migrationDirectory, entry.name, "migration.sql"))).digest("hex")]));
    let applied: RowDataPacket[] = [];
    if (tables.some(table => table.name === "_prisma_migrations")) {
      [applied] = await connection.query<RowDataPacket[]>("SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations");
      if (applied.some(row => expectedMigrations.get(row.migration_name) !== row.checksum)
        || (!applied.length && tables.length > 1)) throw new Error();
    }
    stage = "Prisma migrations";
    // Runtime uses the already packaged CLI and engine. No npm, install, SSH or seed.
    if (process.env.MATHS4U_RUN_MIGRATIONS === "1") {
      const migrationEnv: NodeJS.ProcessEnv = { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1", CHECKPOINT_DISABLE: "1",
        PRISMA_SCHEMA_ENGINE_BINARY: path.join(root, manifest.engine) };
      delete migrationEnv.NEW_ADMIN_PASSWORD;
      delete migrationEnv.NEW_ADMIN_USERNAME;
      delete migrationEnv.NEW_ADMIN_NAME;
      let probe = "access-cli-entry";
      try {
        for (const [role, file] of [["cli-entry", "node_modules/prisma/build/index.js"], ["cli-implementation", "node_modules/prisma/build/cli.js"],
          ["config", "runtime/prisma.config.ts"], ["child-entry", "runtime/prisma-child.cjs"], ["diagnostics", "runtime/diagnostics.cjs"]]) {
          probe = "access-" + role;
          fs.accessSync(path.join(root, file), fs.constants.R_OK);
        }
        probe = "access-node-executable";
        fs.accessSync(process.execPath, fs.constants.X_OK);
        probe = "access-schema-engine";
        fs.accessSync(path.join(root, manifest.engine), fs.constants.R_OK | fs.constants.X_OK);
        const run = (command: string, args: string[], timeout: number) => {
          let result;
          try { result = spawnSync(command, args, { cwd: root, env: migrationEnv, encoding: "utf8", timeout,
            windowsHide: true, maxBuffer: 2 * 1024 * 1024 }); }
          catch (error) {
            console.error("[Maths4U] Prisma diagnostic " + JSON.stringify({ phase: probe, ...childDiagnostic({ error }, true) }));
            throw new Error();
          }
          console.log("[Maths4U] Prisma diagnostic " + JSON.stringify({ phase: probe, ...childDiagnostic(result) }));
          if (result.error || result.status !== 0 || result.signal) throw new Error();
          return result;
        };
        console.log("[Maths4U] Prisma preflight " + JSON.stringify({ files: "readable", engine: "executable", cwd: "release",
          nodeVersion: process.versions.node, opensslVersion: process.versions.openssl, platform: process.platform, arch: process.arch,
          runtimeLoader: Boolean(process.env.LSNODE_ROOT), nodeOptionsPresent: Boolean(process.env.NODE_OPTIONS) }));
        probe = "engine-version";
        const engine = run(path.join(root, manifest.engine), ["--version"], 10000);
        if (!engine.stdout?.includes("schema-engine")) throw new Error();
        probe = "migrate-deploy";
        run(process.execPath, [path.join(root, "runtime/prisma-child.cjs"), "migrate", "deploy",
          "--config", path.join(root, "runtime/prisma.config.ts")], 120000);
      } catch (error) {
        if (probe.startsWith("access-")) console.error("[Maths4U] Prisma diagnostic " + JSON.stringify({ phase: probe, system: errorCode(error) }));
        throw new Error();
      }
      console.log("[Maths4U] Prisma migrations applied; existing data retained.");
    } else {
      if (process.env.MATHS4U_RUN_MIGRATIONS !== "0" || [...expectedMigrations.keys()].some(name =>
        !applied.some(row => row.migration_name === name && row.finished_at && !row.rolled_back_at))
        || applied.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error();
      console.log("[Maths4U] Existing Prisma migration history verified.");
    }
    stage = "first administrator";
    const result = await firstAdministrator({ allowCreate: process.env.MATHS4U_BOOTSTRAP_ADMIN === "1", skipExisting: true });
    console.log("[Maths4U] " + result + ".");
    delete process.env.NEW_ADMIN_PASSWORD;
    delete process.env.NEW_ADMIN_USERNAME;
    delete process.env.NEW_ADMIN_NAME;
    delete process.env.MATHS4U_BOOTSTRAP_ADMIN;
    await disconnectBootstrap();
    await connection.end();
    connection = undefined;
    console.log("[Maths4U] Runtime preparation complete; starting Next.js.");
  } catch {
    if (connection) await connection.end().catch(() => {});
    await disconnectBootstrap().catch(() => {});
    throw new Error("[Maths4U] Startup stopped at " + stage + ". Check private hPanel settings; no credentials were logged.");
  }
}
