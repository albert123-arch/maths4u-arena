import { test } from "node:test";
import assert from "node:assert/strict";
import { archiveContentRights, officialExamUrl, type ExamArchiveQuestionMetadata } from "../src/lib/exam-archive";
import { examArchiveGrantScope, examArchiveHeaders, hasExamArchiveAccess } from "../src/lib/exam-archive-access";
import { archiveImageMatchesType, archiveLegacyAssetLinks, examArchiveFileRange } from "../src/lib/exam-archive-content";
import { inRequestView } from "../src/lib/request-view";
import type { Actor } from "../src/lib/security";

test("Archive grant scope starts and expires at the exact boundary", () => {
  const startsAt = new Date("2026-11-22T00:00:00Z");
  const expiresAt = new Date("2026-11-24T00:00:00Z");
  const grant = { startsAt, expiresAt, revokedAt: null, syllabuses: ["0580", "0580", "9709"] };
  assert.deepEqual(examArchiveGrantScope(grant, startsAt), ["0580", "9709"]);
  assert.deepEqual(examArchiveGrantScope(grant, expiresAt), []);
  assert.deepEqual(examArchiveGrantScope(grant, new Date("2026-11-21T23:59:59.999Z")), []);
  assert.deepEqual(examArchiveGrantScope({ ...grant, revokedAt: startsAt }, startsAt), []);
  assert.deepEqual(examArchiveGrantScope({ ...grant, syllabuses: null }, startsAt), []);
  assert.deepEqual(examArchiveGrantScope({ ...grant, syllabuses: ["XXXX", "9709"] }, startsAt), []);
  assert.deepEqual(examArchiveGrantScope({ ...grant, syllabuses: [] }, startsAt), ["9709", "9231", "0606", "0580"]);
});

test("A role preview never reveals the archive link, even to a true admin", async () => {
  const admin = { status: "ACTIVE", id: "admin", roles: [{ role: "ADMIN" }] } as Actor;
  assert.equal(await hasExamArchiveAccess(admin), true);
  assert.equal(await hasExamArchiveAccess({ ...admin, status: "BLOCKED" }), false);
  assert.equal(await hasExamArchiveAccess(null), false);
  assert.equal(await inRequestView({
    real: admin, actor: admin, sessionId: "session",
    lens: { mode: "ROLE", role: "STUDENT", targetId: null, nonce: "test", expiresAt: "", label: "Role preview" },
  }, () => hasExamArchiveAccess(admin)), false);
});

const entry: ExamArchiveQuestionMetadata = {
  id: "question", syllabus: "9709", marks: 6, questionType: "WRITTEN", difficulty: 2,
  taskVersionId: "exact-version", approvalReference: null, studentApproved: false,
  statementAllowed: false, solutionAllowed: true, markSchemeAllowed: true, assetsAllowed: true,
};
const student = { admin: false, syllabuses: ["9709"] as ("9709")[] };
const admin = { ...student, admin: true };
const none = { statement: false, solution: false, markScheme: false, assets: false };

test("Archive reference-only entries remain gated for both readers and administrators", () => {
  assert.deepEqual(archiveContentRights(student, entry), none);
  assert.deepEqual(archiveContentRights(admin, { ...entry, statementAllowed: true }), none);
  const approved = { ...entry, approvalReference: "Synthetic license", statementAllowed: true };
  assert.deepEqual(archiveContentRights(student, approved), none);
  assert.deepEqual(archiveContentRights(admin, approved), { statement: true, solution: true, markScheme: true, assets: true });
  assert.deepEqual(archiveContentRights(student, { ...approved, studentApproved: true, assetsAllowed: false }),
    { statement: true, solution: true, markScheme: true, assets: false });
  assert.deepEqual(archiveContentRights(student, { ...approved, syllabus: "9231", studentApproved: true }), none);
  assert.deepEqual(archiveContentRights(student, { ...approved, taskVersionId: null, studentApproved: true }), none);
});

test("Archive references only link to the Cambridge domain and carry no-store headers", () => {
  assert.equal(officialExamUrl("https://www.cambridgeinternational.org/programmes-and-qualifications/"), "https://www.cambridgeinternational.org/programmes-and-qualifications/");
  for (const href of [null, "javascript:void(0)", "/private", "https://cambridgeinternational.org.example.com/",
    "https://name:password@cambridgeinternational.org/", "https://cambridgeinternational.org:8443/", "http://cambridgeinternational.org/"]) {
    assert.equal(officialExamUrl(href), null);
  }
  assert.match(examArchiveHeaders["Cache-Control"], /private, no-store/);
  assert.match(examArchiveHeaders["X-Robots-Tag"], /noindex/);
});

test("Archive legacy resources only link to approved file paths on Maths4U", () => {
  const image = { href: "https://maths4u.sbs/uploads/problems/question.png", caption: "Diagram for part (a)" };
  const markScheme = { href: "https://maths4u.sbs/uploads/exams/example.pdf", caption: "Mark scheme" };
  const rows = [
    image, image, markScheme,
    { href: "https://maths4u.sbs/uploads/exams/example.png?variant=1" },
    { href: "https://maths4u.sbs/uploads/problems/example.png#diagram" },
    { href: "https://maths4u.sbs/assets/example.svg" },
    { href: "https://example.com/uploads/problems/example.png" },
    { href: "https://username@maths4u.sbs/uploads/problems/example.png" },
    { href: "https://maths4u.sbs:1234/uploads/problems/example.png" },
    { href: "https://maths4u.sbs/uploads/problems/example.php" },
    { href: "https://maths4u.sbs/uploads/problems/%2520example.png" },
    { href: "/uploads/problems/example.png" },
    null, { href: 1 },
  ];
  assert.deepEqual(archiveLegacyAssetLinks(rows, "diagram"), [image]);
  assert.deepEqual(archiveLegacyAssetLinks(rows, "mark-scheme"), [image, markScheme]);
  assert.deepEqual(archiveLegacyAssetLinks(null, "diagram"), []);
});

test("Archive images require a matching type and validated passive SVG", () => {
  const safe = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M 0 0 H 2"/></svg>');
  const raster = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(archiveImageMatchesType(safe, "image/svg+xml"), true);
  assert.equal(archiveImageMatchesType(raster, "image/svg+xml"), false);
  assert.equal(archiveImageMatchesType(raster, "image/png"), true);
  assert.equal(archiveImageMatchesType(safe, "image/png"), false);
  assert.equal(archiveImageMatchesType(Buffer.from('<svg><image href="https://example.com/test.png"/></svg>'), "image/svg+xml"), false);
  assert.equal(archiveImageMatchesType(Buffer.from("<html></html>"), "text/html"), false);
});

test("Archive byte ranges reject empty, malformed and out-of-bounds requests", () => {
  assert.deepEqual(examArchiveFileRange(null, 12), { start: 0, end: 11 });
  assert.deepEqual(examArchiveFileRange("bytes=2-4", 12), { start: 2, end: 4 });
  assert.deepEqual(examArchiveFileRange("bytes=2-156", 12), { start: 2, end: 11 });
  assert.deepEqual(examArchiveFileRange("bytes=-2", 12), { start: 10, end: 11 });
  for (const range of ["bytes=-", "bytes=-0", "bytes=12-", "bytes=7-5", "bytes=0-2,4-8", "bytes=12345678901234567890-"]) {
    assert.throws(() => examArchiveFileRange(range, 12), /INVALID_RANGE/);
  }
});
