import { test } from "node:test";
import assert from "node:assert/strict";
import { inRequestView, type RequestView } from "../src/lib/request-view";
import { guardViewRequest } from "../src/lib/view-lens";
import { freshIndependent } from "../src/lib/dashboard-evidence";
import type { Evidence } from "../src/lib/square-model";

const view = (mode: "ROLE" | "USER" | null) => ({ real: null, actor: null, sessionId: "fixture", lens: mode ? { mode, role: "STUDENT", nonce: "current", targetId: mode === "USER" ? "student" : null, label: "fixture", expiresAt: "2030-01-01" } : null }) as RequestView;
const call = (mode: "ROLE" | "USER" | null, route: string, method = "POST", nonce = mode ? "current" : "") => inRequestView(view(mode), () => guardViewRequest(new Request("http://local/api/" + route, { method, headers: { "x-arena-view": nonce } }), route));
test("user view blocks every application mutation, including forged destinations", () => {
  for (const route of ["learning/square/check", "learning/square/import", "learning/bookmarks/task", "profile", "attempts/a/submit", "attempts/a/review", "files", "classes", "admin/users/u", "study/start", "view/enter", "catalog/tasks/t/support", "catalog/tasks/t/self-assess"])
    for (const method of ["POST", "PATCH", "DELETE"]) assert.throws(() => call("USER", route, method), /VIEW_READ_ONLY/);
  for (const route of ["view/exit", "view/touch", "auth/logout"]) assert.doesNotThrow(() => call("USER", route));
  assert.doesNotThrow(() => call("USER", "learning/home", "GET"));
});
test("role preview allows only ephemeral check/help operations", () => {
  for (const route of ["learning/square/check", "learning/quadratics/factorisation/help", "learning/square/open", "catalog/tasks/t/support", "view/preview/works/w/check", "view/preview/tasks/t/check"]) assert.doesNotThrow(() => call("ROLE", route));
  for (const route of ["study/start", "attempts/a/save", "attempts/a/submit", "learning/square/import", "learning/square/self-assess", "profile", "basket", "classes", "works", "admin/users/u", "auth/login", "auth/register", "view/enter"]) assert.throws(() => call("ROLE", route), /PREVIEW_NO_WRITES/);
});
test("stale and missing nonces cannot write as a different account or after timeout", () => {
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    assert.throws(() => call("USER", "learning/home", method, ""), /VIEW_CHANGED/);
    assert.throws(() => call(null, "profile", method, "old"), /VIEW_CHANGED/);
  }
  assert.doesNotThrow(() => call("USER", "auth/me", "GET", ""));
  assert.doesNotThrow(() => call("USER", "files/f", "GET", ""));
});
test("request lens context does not leak between concurrent requests", async () => {
  await Promise.all(["ROLE", "USER"].map(mode => inRequestView(view(mode as "ROLE" | "USER"), async () => { await new Promise(r => setTimeout(r, 1)); assert.throws(() => guardViewRequest(new Request("http://local/api/profile", { method: "POST", headers: { "x-arena-view": "current" } }), "profile"), new RegExp(mode === "USER" ? "VIEW_READ_ONLY" : "PREVIEW_NO_WRITES")); })));
});
const e = (uid: string, correct = true, helpUsed = false, imported = false): Evidence => ({ uid, family: "family", correct, helpUsed, imported, at: 1, eventKey: uid });
test("mastery requires a first independent check on a fresh variant", () => {
  assert.equal(freshIndependent([]), false);
  assert.equal(freshIndependent([e("a")]), false);
  assert.equal(freshIndependent([e("a"), e("a")]), false);
  assert.equal(freshIndependent([e("a", false), e("b")]), true);
  assert.equal(freshIndependent([e("a"), e("b", true, true)]), false);
  assert.equal(freshIndependent([e("a"), e("b", true, false, true)]), false);
  assert.equal(freshIndependent([e("a"), e("b", false), e("b")]), false);
  assert.equal(freshIndependent([e("a"), e("b"), e("b", false)]), false);
});
