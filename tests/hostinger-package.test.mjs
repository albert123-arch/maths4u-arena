import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const builtArtifact = path.join(projectRoot, "dist");
const localTestRoot = path.join(projectRoot, ".local");
const targetOrigin = "https://arena.maths4u.sbs";
const explicitDatabase = Boolean(process.env.HOSTINGER_TEST_DATABASE_URL);
const createCiDatabase = process.env.CI === "true" && process.env.HOSTINGER_TEST_CREATE_DATABASE === "1";
const digest = (value) => createHash("sha256").update(value).digest("hex");

async function walk(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}

async function assertInternalSymlinks(artifact) {
  const root = await fs.realpath(artifact);
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const target = await fs.realpath(entryPath);
        const relative = path.relative(root, target);
        assert.ok(relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
          "Every artifact symlink must resolve strictly inside this artifact, including after relocation.");
      } else if (entry.isDirectory()) await visit(entryPath);
    }
  }
  await visit(root);
}

test("Hostinger package includes its runtime and excludes local configuration and test data", async () => {
  await assertInternalSymlinks(builtArtifact);
  const files = await walk(builtArtifact);
  for (const required of [
    "server.js", "next-server.cjs", "runtime/setup.cjs", "runtime/prisma.config.ts",
    "runtime/prisma-child.cjs", "runtime/diagnostics.cjs",
    "prisma/schema.prisma", "prisma/migrations/migration_lock.toml",
    "node_modules/prisma/build/index.js", "node_modules/next/package.json",
    ".next/BUILD_ID",
  ]) assert.ok(files.includes(required), `Required runtime file missing: ${required}`);
  assert.ok(files.some((file) => /^prisma\/migrations\/[^/]+\/migration\.sql$/.test(file)), "Existing migrations must be packaged.");
  assert.ok(files.some((file) => file.startsWith(".next/static/")), "Browser assets must be packaged.");
  const forbidden = files.filter((file) =>
    file.split("/").some((segment) => /^\.env(?:\.|$)/i.test(segment)) ||
    /^(?:\.local|\.git|tests|test-results|fixtures|storage|database)\//i.test(file) ||
    /(?:^|\/)db-secrets\.json$/i.test(file));
  assert.equal(forbidden.length, 0, "Artifact contains local configuration, repository metadata or test data.");
});

// No .env file is loaded here. Local execution needs an explicit, empty,
// separately allocated test database. Production credentials are never used.
async function databaseForTest() {
  if (explicitDatabase) {
    const url = new URL(process.env.HOSTINGER_TEST_DATABASE_URL);
    const database = process.env.HOSTINGER_TEST_DATABASE_NAME || "";
    assert.ok(url.protocol === "mysql:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Only a loopback MySQL test database is accepted.");
    assert.ok(/^maths4u_test_hostinger_[a-z0-9_]+$/.test(database), "Use a separately allocated maths4u_test_hostinger_* database.");
    assert.ok(decodeURIComponent(url.pathname.slice(1)) === database, "The explicit test database name must match the URL.");
    return { database, url: url.toString() };
  }
  assert.ok(createCiDatabase, "Explicit isolated test database configuration is required.");
  const host = process.env.HOSTINGER_TEST_MYSQL_HOST;
  const port = Number(process.env.HOSTINGER_TEST_MYSQL_PORT);
  assert.ok(host === "127.0.0.1" && Number.isInteger(port) && port > 0 && port < 65536, "CI database management is restricted to loopback.");
  const suffix = randomBytes(8).toString("hex");
  const database = `maths4u_test_hostinger_${suffix}`;
  const username = `m4u_ci_${suffix}`;
  const password = randomBytes(32).toString("hex");
  const manager = await mysql.createConnection({ host, port, user: "root", password: "" });
  try {
    // Identifiers are generated internally, never derived from URL input. No
    // DROP, reset, truncation or changes to an existing database are performed.
    await manager.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await manager.query("CREATE USER ?@'%' IDENTIFIED BY ?", [username, password]);
    await manager.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@'%'`, [username]);
  } finally { await manager.end(); }
  return { database, url: `mysql://${username}:${password}@${host}:${port}/${database}` };
}

async function unusedPort() {
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  return port;
}

function launch(artifact, environment) {
  // Hostinger selects nodejs/server.js; that wrapper must enter nodejs/dist.
  const entry = pathToFileURL(path.join(path.dirname(artifact), "server.js")).href;
  const script = `
    process.on('message', () => process.exit(0));
    process.channel?.unref();
    const http = await import('node:http');
    const originalListen = http.Server.prototype.listen;
    let listened = false;
    let entryStarted = 0;
    http.Server.prototype.listen = function(...args) {
      if (listened || Date.now() - entryStarted > 3000) process.exit(79);
      listened = true;
      return originalListen.apply(this, args);
    };
    const { createRequire } = await import('node:module');
    const { realpathSync } = await import('node:fs');
    const path = await import('node:path');
    const root = realpathSync(${JSON.stringify(artifact)});
    const require = createRequire(path.join(root, 'server.js'));
    for (const name of ['next', 'prisma/build/index.js', 'bcryptjs', 'mysql2', '@prisma/client', '@prisma/adapter-mariadb']) {
      if (!realpathSync(require.resolve(name)).startsWith(root + path.sep)) {
        throw new Error('Packaged runtime dependency unexpectedly resolves outside the artifact.');
      }
    }
    entryStarted = Date.now();
    setTimeout(() => { if (!listened) process.exit(78); }, 3000).unref();
    await import(${JSON.stringify(entry)});
  `;
  const childEnvironment = { ...process.env };
  for (const key of Object.keys(childEnvironment)) {
    if (/^(?:MATHS4U_|NEW_ADMIN_|HOSTINGER_TEST_|DB_)/.test(key) ||
      ["DATABASE_URL", "APP_URL", "PRIVATE_STORAGE_PATH", "NODE_PATH"].includes(key)) delete childEnvironment[key];
  }
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    cwd: path.dirname(artifact),
    windowsHide: true,
    env: { ...childEnvironment, NODE_PATH: "", ...environment },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = "";
  let spawnFailed = false;
  child.on("error", () => { spawnFailed = true; });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    output = (output + chunk.toString()).slice(-64 * 1024);
  });
  return { child, output: () => output, spawnFailed: () => spawnFailed };
}

async function stop(server) {
  if (!server || server.spawnFailed() || server.child.exitCode !== null || server.child.signalCode !== null) return;
  const child = server.child;
  const done = once(child, "exit").catch(() => undefined);
  if (child.connected) child.send({ command: "stop" }, () => undefined);
  const timer = setTimeout(() => child.kill(), 5000);
  timer.unref();
  await done;
  clearTimeout(timer);
}

async function waitForHealth(server, port) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    assert.ok(!server.spawnFailed() && server.child.exitCode === null && server.child.signalCode === null,
      "Packaged application exited before becoming healthy; child output is withheld to protect credentials.");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        const body = await response.json();
        if (body.status === "ok" && body.application === "Maths4U") return;
      }
    } catch { /* Startup and migration can take several seconds. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.fail("Packaged application did not become healthy on the supplied PORT within 30 seconds.");
}

async function expectStartupRejected(artifact, environment) {
  const server = launch(artifact, environment);
  let timer;
  try {
    const result = await Promise.race([
      once(server.child, "exit"),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("STARTUP_REJECTION_TIMEOUT")), 10000); }),
    ]);
    assert.ok(result[0] !== 0, "Invalid production configuration must fail startup.");
  } finally {
    clearTimeout(timer);
    await stop(server);
  }
}

async function replaceArtifact(temporaryRoot, artifact) {
  const relative = path.relative(await fs.realpath(temporaryRoot), path.resolve(artifact));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Artifact replacement must stay inside this test's temporary directory.");
  await fs.rm(artifact, { recursive: true, force: true });
  // npm's Linux .bin links are relative to their package. Preserve that text so
  // moving the deployment cannot point them back at the original build folder.
  await fs.cp(builtArtifact, artifact, { recursive: true, verbatimSymlinks: true });
  await fs.copyFile(path.join(projectRoot, "server.js"), path.join(path.dirname(artifact), "server.js"));
  if (process.platform !== "win32") {
    const manifest = JSON.parse(await fs.readFile(path.join(artifact, "hostinger-build.json"), "utf8"));
    // Reproduce the actual Hostinger failure on every replacement of the release.
    await fs.chmod(path.join(artifact, manifest.engine), 0o644);
  }
  await assertInternalSymlinks(artifact);
}

async function waitForReadinessGate(server, port) {
  // The child enforces the literal listen() deadline from entry loading. Allow
  // extra time here for Windows process creation and dependency-resolution checks.
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    assert.ok(server.child.exitCode === null, "Startup must remain alive while waiting for the migration lock.");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(400) });
      if (response.status === 503) {
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), { status: "starting" });
        return;
      }
    } catch { /* Wait only for the initial HTTP bind, never for database setup. */ }
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.fail("HTTP must bind before Hostinger's three-second deadline and report 503 until ready.");
}

async function verifyAdministratorLogin(port, username, password) {
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: "POST",
    headers: { "content-type": "application/json", origin: targetOrigin }, body: JSON.stringify({ username, password }) });
  assert.equal(response.status, 200, "The supplied first-administrator credentials must work over HTTP.");
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Login must issue a session cookie.");
  const profile = await fetch(`http://127.0.0.1:${port}/api/auth/me`, { headers: { cookie } });
  assert.equal(profile.status, 200);
  const body = await profile.json();
  assert.ok(body.user?.username === username && body.user.roles.some(role => role.role === "ADMIN"), "The session must belong to the existing administrator.");
}

test("Hostinger artifact migrates once, preserves administrator and files across redeployment, and honors PORT", {
  timeout: 180000,
  skip: !explicitDatabase && !createCiDatabase ? "Set explicit HOSTINGER_TEST_DATABASE_URL and HOSTINGER_TEST_DATABASE_NAME for a new empty loopback test database." : false,
}, async () => {
  let connection;
  let server;
  let temporaryRoot;
  try {
    const configuration = await databaseForTest();
    connection = await mysql.createConnection(configuration.url);
    const [tables] = await connection.query("SHOW TABLES");
    assert.equal(tables.length, 0, "The allocated package-test database must be empty; no existing data will be reset.");
    await fs.mkdir(localTestRoot, { recursive: true });
    temporaryRoot = await fs.mkdtemp(path.join(localTestRoot, "hostinger-package-"));
    const artifact = path.join(temporaryRoot, "hbuilds", "current", "nodejs", "dist");
    const privateStorage = path.join(temporaryRoot, "private-files");
    await replaceArtifact(temporaryRoot, artifact);
    const port = await unusedPort();
    const password = randomBytes(24).toString("hex");
    const username = `admin_${randomBytes(8).toString("hex")}`;
    const environment = {
      NODE_ENV: "production", MATHS4U_ENV: "production",
      MATHS4U_DATABASE_URL: configuration.url, MATHS4U_DATABASE_NAME: configuration.database,
      APP_URL: targetOrigin, PRIVATE_STORAGE_PATH: privateStorage,
      HOSTNAME: "127.0.0.1", PORT: String(port),
      MATHS4U_RUN_MIGRATIONS: "1", MATHS4U_BOOTSTRAP_ADMIN: "1",
      NEW_ADMIN_USERNAME: username, NEW_ADMIN_PASSWORD: password, NEW_ADMIN_NAME: "Package test administrator",
    };
    const deploymentLock = "maths4u-deploy-" + digest(configuration.database).slice(0, 40);
    const [held] = await connection.query("SELECT GET_LOCK(?, 0) AS acquired", [deploymentLock]);
    assert.equal(Number(held[0].acquired), 1);
    server = launch(artifact, environment);
    try {
      await waitForReadinessGate(server, port);
      await new Promise(resolve => setTimeout(resolve, 3200));
      for (const pathname of ["/", "/api/health", "/api/auth/login"]) {
        const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
        assert.equal(response.status, 503, "No application API may be available before database preparation.");
      }
      const [beforeMigration] = await connection.query("SHOW TABLES");
      assert.equal(beforeMigration.length, 0, "Preparation cannot bypass the held migration lock.");
    } finally { await connection.query("SELECT RELEASE_LOCK(?)", [deploymentLock]); }
    await waitForHealth(server, port);
    await verifyAdministratorLogin(port, username, password);
    const homepage = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(homepage.status, 200, "Homepage must load on the supplied hosting port.");
    assert.match(await homepage.text(), /Maths4U/);
    assert.ok(!server.output().includes(password) && !server.output().includes(configuration.url), "Startup output must not expose credentials.");
    const [admins] = await connection.query("SELECT u.id, u.username, u.passwordHash, u.displayName FROM User u JOIN UserRole r ON r.userId = u.id WHERE r.role = 'ADMIN'");
    assert.equal(admins.length, 1, "Exactly one first administrator must exist.");
    assert.ok(admins[0].username === username && await bcrypt.compare(password, admins[0].passwordHash), "First administrator must use the supplied credentials.");
    const originalAdmin = admins[0];
    const [migrations] = await connection.query("SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name");
    assert.ok(migrations.length > 0 && migrations.every((row) => row.finished_at && !row.rolled_back_at), "Every packaged migration must have completed successfully.");
    const migrationFiles = (await walk(path.join(artifact, "prisma", "migrations")))
      .filter((file) => /^[^/]+\/migration\.sql$/.test(file)).sort();
    assert.deepEqual(migrations.map((row) => row.migration_name), migrationFiles.map((file) => file.split("/")[0]), "All migrations from the delivered artifact must be applied.");
    for (let index = 0; index < migrationFiles.length; index += 1) {
      const expectedChecksum = digest(await fs.readFile(path.join(artifact, "prisma", "migrations", migrationFiles[index])));
      assert.ok(migrations[index].checksum === expectedChecksum, "Applied migration checksum must match the delivered SQL file.");
    }
    const marker = `package-preservation-${randomBytes(8).toString("hex")}`;
    await connection.query("INSERT INTO RateLimit (`key`, count, expiresAt) VALUES (?, 17, ?)", [marker, new Date("2099-01-01")]);
    const probePath = path.join(privateStorage, ".maths4u-storage-probe");
    const firstProbe = digest(await fs.readFile(probePath));
    const filePath = path.join(privateStorage, "retained-private-file.txt");
    const privateContent = randomBytes(32).toString("hex");
    await fs.writeFile(filePath, privateContent, { flag: "wx" });
    await stop(server);
    server = undefined;

    const missingProduction = { ...environment, MATHS4U_RUN_MIGRATIONS: "0", MATHS4U_BOOTSTRAP_ADMIN: "0" };
    delete missingProduction.MATHS4U_ENV;
    await expectStartupRejected(artifact, missingProduction);
    await expectStartupRejected(artifact, { ...environment, PRIVATE_STORAGE_PATH: path.join(temporaryRoot, "public_html", "private-files") });

    // Replacing the entire artifact models a redeploy; sibling private files and
    // the database must survive. A different bootstrap input must change nothing.
    await replaceArtifact(temporaryRoot, artifact);
    const repeatedPassword = randomBytes(24).toString("hex");
    server = launch(artifact, {
      ...environment, NEW_ADMIN_USERNAME: `different_${randomBytes(5).toString("hex")}`,
      NEW_ADMIN_PASSWORD: repeatedPassword, NEW_ADMIN_NAME: "Must not overwrite administrator",
    });
    await waitForHealth(server, port);
    assert.ok(!server.output().includes(repeatedPassword) && !server.output().includes(configuration.url), "Repeated startup output must not expose credentials.");
    const [after] = await connection.query("SELECT u.id, u.username, u.passwordHash, u.displayName FROM User u JOIN UserRole r ON r.userId = u.id WHERE r.role = 'ADMIN'");
    assert.equal(after.length, 1, "Repeat startup must not create another administrator.");
    const [users] = await connection.query("SELECT COUNT(*) AS total FROM User");
    assert.equal(users[0].total, 1, "Repeat bootstrap must not create additional user accounts.");
    assert.ok(after[0].id === originalAdmin.id && after[0].username === originalAdmin.username &&
      after[0].passwordHash === originalAdmin.passwordHash && after[0].displayName === originalAdmin.displayName,
    "Repeat bootstrap must leave the existing administrator and password hash untouched.");
    const [afterMigrations] = await connection.query("SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name");
    assert.deepEqual(afterMigrations, migrations, "Repeat migrate deploy must not recreate or change migration records.");
    const [markers] = await connection.query("SELECT count FROM RateLimit WHERE `key` = ?", [marker]);
    assert.equal(markers[0]?.count, 17, "Pre-existing application data must survive repeat deployment.");
    assert.ok(digest(await fs.readFile(probePath)) === firstProbe, "Storage identity probe must survive repeat deployment.");
    assert.ok(await fs.readFile(filePath, "utf8") === privateContent, "Private file contents must survive replacement of the deployment directory.");
    await stop(server);
    server = undefined;
    // Once bootstrap is complete, deployment must also work after its temporary
    // switches and administrator credentials have been removed from hPanel.
    const steadyEnvironment = { ...environment, MATHS4U_RUN_MIGRATIONS: "0", MATHS4U_BOOTSTRAP_ADMIN: "0" };
    delete steadyEnvironment.NEW_ADMIN_USERNAME;
    delete steadyEnvironment.NEW_ADMIN_PASSWORD;
    delete steadyEnvironment.NEW_ADMIN_NAME;
    server = launch(artifact, steadyEnvironment);
    await waitForHealth(server, port);
    await verifyAdministratorLogin(port, username, password);
  } catch (error) {
    if (error?.code === "ERR_ASSERTION") throw error;
    // Driver and subprocess errors can contain connection strings or SQL values.
    assert.fail("Hostinger package integration failed. Sensitive driver/subprocess details were intentionally withheld.");
  } finally {
    await stop(server);
    if (connection) await connection.end().catch(() => undefined);
    // Databases are deliberately retained on local runs; CI destroys its own
    // disposable service. Only this test's generated temporary folder is removed.
    if (temporaryRoot) {
      const resolved = await fs.realpath(temporaryRoot);
      const parent = await fs.realpath(localTestRoot);
      assert.ok(path.dirname(resolved) === parent && path.basename(resolved).startsWith("hostinger-package-"), "Cleanup must remain inside the generated temporary directory.");
      await fs.rm(resolved, { recursive: true, force: true });
    }
  }
});
