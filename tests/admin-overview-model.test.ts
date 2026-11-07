import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overviewActivity, overviewCourseContent, overviewDayMs, overviewStorageCapacity, overviewTimeZone, overviewWindow, type OverviewCourseInput } from '../src/lib/admin-overview-model';

const now = Date.UTC(2026, 10, 7, 12, 34, 56), window = overviewWindow(now, 'Asia/Tashkent');
const course = (id: string, overrides: Partial<OverviewCourseInput> = {}): OverviewCourseInput => ({
  id, slug: id, title: 'Course ' + id, published: true, archived: false, free: true,
  chapters: [{ id: 'chapter-' + id, taskIds: ['one', 'two', 'one'] }], ...overrides,
});

test('course metrics deduplicate Task identities within lessons and across courses', () => {
  const result = overviewCourseContent([course('a'), course('b', { chapters: [{ id: 'chapter-b', taskIds: ['two', 'three'] }] })], []);
  assert.equal(result.courses[0].availableQuestions, 2);
  assert.equal(result.courses[1].availableQuestions, 2);
  assert.equal(result.publishedCourseQuestions, 3);
  assert.equal(result.publishedChapters, 2);
  assert.equal(result.publishedCourses, 2);
});

test('private, archived and subscription-gated courses do not inflate guest-available questions', () => {
  const result = overviewCourseContent([
    course('live', { chapters: [{ id: 'live', taskIds: ['public'] }] }),
    course('private', { published: false, chapters: [{ id: 'draft', taskIds: ['draft-only'] }] }),
    course('archived', { archived: true, chapters: [{ id: 'archived', taskIds: ['archived-only'] }] }),
    course('paid', { free: false, chapters: [{ id: 'paid', taskIds: ['paid-only'] }] }),
    course('empty', { chapters: [] }),
  ], []);
  assert.equal(result.publishedCourseQuestions, 1);
  assert.equal(result.publishedCourses, 2, 'paid published courses have visible locked chapters; empty courses are not in the guest course navigation');
  assert.equal(result.publishedChapters, 2);
  assert.deepEqual(result.courses.map(row => row.availableQuestions), [1, 0, 0, 0, 0]);
  assert.equal(result.courses[1].published, false);
  assert.equal(result.courses[2].archived, true);
});

test('only actual installed DRAFT package states count as drafts', () => {
  const result = overviewCourseContent([course('a')], [
    { key: 'draft', courseId: 'a', state: 'DRAFT' },
    { key: 'published', courseId: 'a', state: 'PUBLISHED' },
    { key: 'old', courseId: 'a', state: 'ARCHIVED' },
    { key: 'not-installed', courseId: 'a', state: 'NOT_INSTALLED' },
  ]);
  assert.equal(result.draftPackages, 1);
  assert.equal(result.courses[0].draftPackages, 1);
  assert.deepEqual(result.courses[0].packageStates.map(pack => pack.state), ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'NOT_INSTALLED']);
});

test('rolling window is exactly seven 24-hour intervals, with explicit local labels', () => {
  assert.equal(Date.parse(window.to) - Date.parse(window.from), 7 * overviewDayMs);
  assert.equal(window.kind, 'rolling7days');
  assert.equal(window.buckets.length, 7);
  assert.equal(window.buckets[0].from, window.from);
  assert.equal(window.buckets.at(-1)?.to, window.to);
  for (let i = 0; i < window.buckets.length; i++) {
    assert.equal(Date.parse(window.buckets[i].to) - Date.parse(window.buckets[i].from), overviewDayMs);
    if (i) assert.equal(window.buckets[i - 1].to, window.buckets[i].from);
  }
  const dst = overviewWindow(Date.UTC(2026, 10, 2, 17), 'America/New_York');
  assert.equal(Date.parse(dst.to) - Date.parse(dst.from), 7 * overviewDayMs, 'DST does not silently change a rolling duration');
  assert.equal(overviewTimeZone('invalid-time-zone'), 'UTC');
  assert.equal(overviewTimeZone('Asia/Tashkent'), 'Asia/Tashkent');
});

test('whole-window active learners use a distinct aggregate rather than summing daily learners', () => {
  const result = overviewActivity(window, [{ bucket: 0, total: 2 }, { bucket: 6, total: 2 }, { bucket: null, total: 3 }], [{ bucket: 6, total: 1 }, { bucket: null, total: 1 }]);
  assert.equal(result.activeLearners, 3);
  assert.equal(result.series.reduce((total, day) => total + day.activeLearners, 0), 4);
  assert.equal(result.newRegistrations, 1);
  assert.equal(result.series[1].activeLearners, 0);
  assert.equal(result.guestVisitors, null, 'missing guest analytics never becomes a zero measurement');
});

test('an empty successful aggregate reports zero learning actions and keeps guest analytics missing', () => {
  const result = overviewActivity(window, [], []);
  assert.equal(result.activeLearners, 0);
  assert.equal(result.newRegistrations, 0);
  assert.equal(result.series.length, 7);
  assert.ok(result.series.every(day => day.activeLearners === 0 && day.newRegistrations === 0));
  assert.equal(result.guestVisitors, null);
});

const fs = { bsize: BigInt(4096), blocks: BigInt(1000), bfree: BigInt(600), bavail: BigInt(550), files: BigInt(100), ffree: BigInt(40) };
test('storage distinguishes used blocks from the blocks available to the service account', () => {
  const result = overviewStorageCapacity(fs, true);
  assert.equal(result.status, 'available');
  assert.equal(result.totalBytes, 4_096_000);
  assert.equal(result.usedBytes, 1_638_400);
  assert.equal(result.availableBytes, 2_252_800);
  assert.equal(result.usedPercent, 40);
  assert.deepEqual(result.inodes, { total: 100, free: 40, usedPercent: 60 });
});

test('unsupported or zero inode measurements remain missing', () => {
  assert.equal(overviewStorageCapacity(fs, false).inodes, null);
  assert.equal(overviewStorageCapacity({ ...fs, files: BigInt(0), ffree: BigInt(0) }, true).inodes, null);
  assert.equal(overviewStorageCapacity({ ...fs, ffree: BigInt(101) }, true).inodes, null);
});

test('unavailable, invalid or imprecisely large capacities never appear as healthy zero storage', () => {
  for (const result of [
    overviewStorageCapacity(null, false),
    overviewStorageCapacity({ ...fs, blocks: BigInt(0) }, true),
    overviewStorageCapacity({ ...fs, bavail: BigInt(700) }, true),
    overviewStorageCapacity({ ...fs, blocks: BigInt(Number.MAX_SAFE_INTEGER) }, true),
  ]) {
    assert.equal(result.status, 'unavailable');
    assert.equal(result.totalBytes, null);
    assert.equal(result.usedPercent, null);
    assert.equal(result.inodes, null);
  }
});
