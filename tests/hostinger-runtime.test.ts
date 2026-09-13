import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { prepareEngine } from "../scripts/hostinger/engine-access";
import { migrationChild } from "../scripts/hostinger/child-process";
import { childDiagnostic } from "../scripts/hostinger/diagnostics";

async function fixture() {
  const local = path.resolve(".local");
  await fs.mkdir(local, { recursive: true });
  const root = await fs.mkdtemp(path.join(local, "engine-access-test-"));
  const relative = "schema-engine-test";
  const file = path.join(root, relative);
  const content = "synthetic engine fixture; never executed";
  await fs.writeFile(file, content, { mode: 0o644 });
  const hash = createHash("sha256").update(content).digest("hex");
  async function cleanup() {
    const real = await fs.realpath(root);
    assert.equal(path.dirname(real), await fs.realpath(local));
    assert.ok(path.basename(real).startsWith("engine-access-test-"));
    await fs.rm(real, { recursive: true, force: true });
  }
  return { root, relative, file, hash, cleanup };
}

test("restore only owner execute after Hostinger strips engine permissions", { skip: process.platform === "win32" }, async () => {
  const f = await fixture();
  try {
    await fs.chmod(f.file, 0o640);
    assert.deepEqual(prepareEngine(f.root, f.relative, f.hash), { repaired: true, originalMode: "640", mode: "740" });
    assert.equal(prepareEngine(f.root, f.relative, f.hash).repaired, false);
  } finally { await f.cleanup(); }
});

test("a modified engine is rejected before any permission change", async () => {
  const f = await fixture();
  try {
    const mode = (await fs.stat(f.file)).mode;
    assert.throws(() => prepareEngine(f.root, f.relative, "0".repeat(64)), /DIGEST_MISMATCH/);
    assert.equal((await fs.stat(f.file)).mode, mode);
    assert.throws(() => prepareEngine(f.root, f.relative, ""), /DIGEST_REQUIRED/);
  } finally { await f.cleanup(); }
});

test("migration child stays asynchronous and captures spawn failures without raw diagnostics", async () => {
  let eventLoopProgress = false;
  const timer = setTimeout(() => { eventLoopProgress = true; }, 10);
  const result = await migrationChild(process.execPath, ["-e", "setTimeout(() => process.exit(0), 150)"], process.cwd(), process.env);
  clearTimeout(timer);
  assert.equal(result.status, 0);
  assert.ok(eventLoopProgress);
  const missing = await migrationChild(path.resolve(".local", "absent-prisma-node"), [], process.cwd(), process.env);
  assert.equal(childDiagnostic(missing).system, "ENOENT");
  assert.equal(missing.status === null || missing.status !== 0, true);
});
