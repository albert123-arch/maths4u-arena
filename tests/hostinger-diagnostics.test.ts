import assert from "node:assert/strict";
import { test } from "node:test";
import { childDiagnostic, errorCode } from "../scripts/hostinger/diagnostics";

test("child diagnostics handle spawn exceptions and absent streams without exposing error messages", () => {
  const secret = "private-value-never-log";
  const result = childDiagnostic({ error: Object.assign(new Error(secret), { code: "EACCES" }), stdout: null, stderr: undefined }, true);
  assert.equal(result.system, "EACCES");
  assert.equal(result.status, null);
  assert.equal(result.thrown, true);
  assert.equal(result.loaded, "not-entered");
  assert.equal(result.stdoutBytes, 0);
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.equal(errorCode({ code: secret }), "UNKNOWN");
});

test("child diagnostics allow only known codes, loading markers and library failure categories", () => {
  const secret = "mysql://private-user:private-password@private-host/private-db";
  const result = childDiagnostic({ status: 1, signal: null,
    stdout: Buffer.from("[Maths4U:Prisma] node-entered\n[Maths4U:Prisma] cli-loading\n[Maths4U:Prisma] config-ready"),
    stderr: `ERR_MODULE_NOT_FOUND ${secret}\nP1001\nlibssl.so.3: cannot open shared object file` });
  assert.deepEqual(result.node, ["ERR_MODULE_NOT_FOUND"]);
  assert.deepEqual(result.prisma, ["P1001"]);
  assert.equal(result.loaded, "config-ready");
  assert.deepEqual(result.hints, ["DYNAMIC_LINKER", "OPENSSL_LIBRARY"]);
  assert.ok(!JSON.stringify(result).includes("private-"));
  assert.equal(childDiagnostic({ status: null, signal: "SIGKILL", error: { code: "ETIMEDOUT" } }).signal, "SIGKILL");
  assert.equal(childDiagnostic({ status: secret, signal: secret }).signal, "UNKNOWN");
});
