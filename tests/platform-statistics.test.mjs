import { test } from "node:test";
import assert from "node:assert/strict";
import { createStatistics, publicPage, CONSENT_KEY, MEASUREMENT_ID } from "../src/lib/platform-statistics.mjs";

class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = value; }
}
function fixture(saved = null, host = "arena.maths4u.sbs") {
  const store = new Map(saved ? [[CONSENT_KEY, JSON.stringify(saved)]] : []);
  let reloads = 0;
  const win = {
    location: { hostname: host, search: "?email=private@example.com", hash: "#private", reload: () => reloads++ },
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
    addEventListener() {}, removeEventListener() {},
  };
  const doc = { createElement: tag => new Node(tag), head: new Node("head"), referrer: "https://example.com/private?token=secret" };
  const container = new Node("div"), controller = createStatistics({ container, win, doc });
  const buttons = () => container.children.flatMap(n => [n, ...n.children]).filter(n => n.tag === "button");
  const click = text => buttons().find(n => n.textContent === text).onclick();
  return { win, doc, controller, container, click, store, reloads: () => reloads };
}
const granted = () => ({ value: "granted", time: Date.now() });

test("default and refusal make no Google request; stored refusal persists", () => {
  const f = fixture();
  f.controller.update({ path: "/", eligible: true, language: "en" });
  assert.equal(f.doc.head.children.length, 0);
  assert.equal(f.win.dataLayer, undefined);
  f.click("Do not allow");
  assert.equal(f.doc.head.children.length, 0);
  assert.equal(JSON.parse(f.store.get(CONSENT_KEY)).value, "denied");
  assert.equal(f.win[`ga-disable-${MEASUREMENT_ID}`], true);
});
test("opt-in sends a single sanitized page view with advertising disabled", () => {
  const f = fixture();
  f.controller.update({ path: "/courses", eligible: true, language: "en" });
  f.click("Allow");
  assert.equal(f.doc.head.children.length, 1);
  assert.equal(f.doc.head.children[0].referrerPolicy, "origin");
  const events = f.win.dataLayer.map(e => Array.from(e));
  const config = events.find(e => e[0] === "config")[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_domain, "none");
  assert.equal(events[0][2].ad_storage, "denied");
  const views = events.filter(e => e[0] === "event");
  assert.equal(views.length, 1);
  assert.equal(views[0][2].page_location, "https://arena.maths4u.sbs/courses");
  assert.equal(views[0][2].page_referrer, "https://example.com");
  assert.doesNotMatch(JSON.stringify(events), /private|token|secret|email|@/);
  f.controller.update({ path: "/courses", eligible: true, language: "ru" });
  assert.equal(f.win.dataLayer.filter(e => e[0] === "event").length, 1);
});
test("accounts, private routes and exercises are excluded even with consent", () => {
  for (const path of ["/login", "/register", "/recover", "/teacher/classes/student-id", "/attempts/123", "/courses/example/topics/123", "/works/123"]) {
    const f = fixture(granted());
    f.controller.update({ path, eligible: true, language: "en" });
    assert.equal(f.doc.head.children.length, 0, path);
    assert.equal(f.container.hidden, true, path);
  }
  const f = fixture(granted());
  f.controller.update({ path: "/", eligible: false, language: "en" });
  assert.equal(f.doc.head.children.length, 0);
});
test("SPA navigation disables measurement on private pages and resumes on catalogues", () => {
  const f = fixture(granted());
  f.controller.update({ path: "/", eligible: true, language: "en" });
  const count = f.win.dataLayer.length;
  f.controller.update({ path: "/student/progress", eligible: true, language: "en" });
  assert.equal(f.win[`ga-disable-${MEASUREMENT_ID}`], true);
  assert.equal(f.win.dataLayer.length, count);
  f.controller.update({ path: "/library", eligible: true, language: "en" });
  assert.equal(f.win[`ga-disable-${MEASUREMENT_ID}`], false);
  assert.equal(f.doc.head.children.length, 1);
  assert.equal(f.win.dataLayer.filter(e => e[0] === "event").length, 2);
  f.controller.destroy();
  assert.equal(f.win[`ga-disable-${MEASUREMENT_ID}`], true);
});
test("withdrawal immediately disables and unloads Analytics", () => {
  const f = fixture(granted());
  f.controller.update({ path: "/", eligible: true, language: "en" });
  f.click("Statistics settings"); f.click("Do not allow");
  assert.equal(f.win[`ga-disable-${MEASUREMENT_ID}`], true);
  assert.equal(f.reloads(), 1);
});
test("expired consent and unexpected hosts are excluded; Olymp uses its own host", () => {
  const f = fixture({ value: "granted", time: Date.now() - 181 * 86400000 });
  f.controller.update({ path: "/", eligible: true, language: "en" });
  assert.equal(f.doc.head.children.length, 0);
  assert.equal(publicPage("localhost", "/"), null);
  assert.equal(publicPage("olymp.maths4u.sbs", "/login"), null);
  assert.equal(publicPage("olymp.maths4u.sbs", "/ladders/"), "/ladders");
  const o = fixture(granted(), "olymp.maths4u.sbs");
  o.controller.update({ path: "/ladders", eligible: true, language: "ru" });
  const view = o.win.dataLayer.find(e => e[0] === "event");
  assert.equal(view[2].page_location, "https://olymp.maths4u.sbs/ladders");
});
