"use client";

import { useRef, useState } from "react";
import type { contentPackageStatus, planContentPackage } from "@/lib/content-packages";
import { Button } from "./controls";
import { api, ApiError } from "./ui";
import packagePin from "./course-release-20261122-pin.json";

type Registry = Awaited<ReturnType<typeof contentPackageStatus>>;
type Package = (typeof packagePin)[number];
type Report = Awaited<ReturnType<typeof planContentPackage>>;
type InstallState = "NOT_INSTALLED" | "DRAFT" | "PUBLISHED";
type PackagePlan = { item: Package; state: InstallState };
type Action = "apply" | "publish";

const path = "admin/content-packages";
const markerKey = "arena-course-release-20261122";
// Allow a previous request to finish its transaction after a connection loss or refresh.
const recoveryMs = 300_000;
const courses = [
  { slug: "maths4u-0580", name: "0580 Mathematics", packages: 38, questions: 6938, lessons: 231 },
  { slug: "maths4u-0606", name: "0606 Additional Mathematics", packages: 16, questions: 6694, lessons: 107 },
  { slug: "maths4u-0862-stage-7", name: "0862 Stage 7", packages: 9, questions: 1368, lessons: 31 },
  { slug: "maths4u-0862-stage-8", name: "0862 Stage 8", packages: 10, questions: 1136, lessons: 24 },
  { slug: "maths4u-0862-stage-9", name: "0862 Stage 9", packages: 11, questions: 1496, lessons: 33 },
];

function insist(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkRegistry(rows: Registry) {
  insist(packagePin.length === 84 && new Set(packagePin.map(item => item.key)).size === 84, "The release must contain 84 distinct packages.");
  const registry = new Map(rows.map(row => [row.key, row]));
  const states = new Map<string, InstallState>();
  for (const course of courses) {
    const items = packagePin.filter(item => item.courseSlug === course.slug);
    const coursePath = `/courses/${course.slug}`;
    insist(items.length === course.packages && rows.filter(row => row.coursePath === coursePath).length === course.packages &&
      items.reduce((sum, item) => sum + item.questions, 0) === course.questions &&
      items.reduce((sum, item) => sum + item.lessons.length, 0) === course.lessons, `${course.name} does not match the release totals.`);
    for (const item of items) {
      const row = registry.get(item.key);
      insist(row && row.version === item.version && row.fingerprint === item.fingerprint && row.coursePath === coursePath &&
        row.questions === item.questions && row.lessons.length === item.lessons.length &&
        row.lessons.every((lesson, index) => lesson.id === item.lessons[index]), `${item.key} does not match the reviewed package.`);
      insist(row.state === "NOT_INSTALLED" || row.state === "DRAFT" || row.state === "PUBLISHED", `${item.key} is in an unexpected state.`);
      states.set(item.key, row.state);
    }
  }
  insist(states.size === packagePin.length, "The release contains packages outside these five courses.");
  return states;
}

function checkReport(report: Report, item: Package, state: InstallState, expectedState?: "APPLIED") {
  const fresh = state === "NOT_INSTALLED";
  insist(report.key === item.key && report.version === item.version && report.fingerprint === item.fingerprint &&
    report.state === (expectedState ?? (fresh ? "DRY_RUN" : "ALREADY_APPLIED")), `${item.key} returned an unexpected dry-run or apply result.`);
  insist(report.create === (fresh ? item.questions : 0) && report.update === 0 && report.skip === (fresh ? 0 : item.questions) &&
    report.lessonChanges === (fresh ? item.lessons.length : 0), `${item.key} would affect records outside the verified plan.`);
  insist(!fresh || /^[a-f0-9]{64}$/.test(report.token), `${item.key} has no valid dry-run token.`);
}

async function inspect(item: Package, state: InstallState) {
  const report = await api<Report>(`${path}/${item.key}/dry-run`, "POST");
  checkReport(report, item, state);
  return report;
}

function readPending(states: Map<string, InstallState>) {
  const saved = localStorage.getItem(markerKey);
  if (!saved) return;
  const pending = JSON.parse(saved) as { key: string; action: Action; until: number };
  const state = states.get(pending.key);
  insist(state && (pending.action === "apply" || pending.action === "publish") && Number.isSafeInteger(pending.until), "The previous release request could not be identified.");
  const complete = state === "PUBLISHED" || (state === "DRAFT" && pending.action === "apply");
  const seconds = Math.ceil((pending.until - Date.now()) / 1000);
  insist(complete || seconds <= 0, `${pending.key} may still be processing. Check again in ${seconds} seconds.`);
  localStorage.removeItem(markerKey);
}

class UncertainWrite extends Error {}

async function write<T>(item: Package, action: Action, body: unknown) {
  localStorage.setItem(markerKey, JSON.stringify({ key: item.key, action, until: Date.now() + recoveryMs }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      api<T>(`${path}/${item.key}/${action === "apply" ? "apply" : "state"}`, "POST", body),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new UncertainWrite()), action === "apply" ? 220_000 : 100_000); }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500 && error.status !== 408 && error.code !== "UNEXPECTED_SERVER_RESPONSE") {
      localStorage.removeItem(markerKey);
      throw error;
    }
    throw new UncertainWrite(`${item.key} may still be processing.`);
  } finally { clearTimeout(timer); }
}

async function confirmWrite(item: Package, action: Action) {
  const deadline = Date.now() + 60_000;
  do {
    const registry = checkRegistry(await api<Registry>(path));
    const state = registry.get(item.key)!;
    if (state === "PUBLISHED" || (action === "apply" && state === "DRAFT")) {
      await inspect(item, state);
      localStorage.removeItem(markerKey);
      return state;
    }
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 5000));
  } while (true);
  throw new Error(`${item.key} did not confirm ${action}. Run the release check again once the request has finished.`);
}

async function publish(approved: PackagePlan, state: InstallState) {
  const { item } = approved;
  insist(state === approved.state, `${item.key} changed after the release check. Check the release again.`);
  if (state === "PUBLISHED") return;
  const report = await inspect(item, state);
  if (state === "NOT_INSTALLED") {
    try {
      const applied = await write<Report>(item, "apply", { token: report.token });
      checkReport(applied, item, state, "APPLIED");
      localStorage.removeItem(markerKey);
      state = "DRAFT";
    } catch (error) {
      if (!(error instanceof UncertainWrite)) throw error;
      state = await confirmWrite(item, "apply");
    }
  }
  if (state === "DRAFT") {
    try {
      const result = await write<{ state: string }>(item, "publish", { action: "publish", fingerprint: item.fingerprint });
      insist(result.state === "PUBLISHED", `${item.key} returned an unexpected publication result.`);
      localStorage.removeItem(markerKey);
    } catch (error) {
      if (!(error instanceof UncertainWrite)) throw error;
      await confirmWrite(item, "publish");
    }
  }
}

export function CourseRelease20261122({ registry, onBusy, onRefresh, disabled }: { registry: Registry; onBusy: (busy: boolean) => void; onRefresh: () => void; disabled: boolean }) {
  const [plan, setPlan] = useState<PackagePlan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const running = useRef(false);
  const published = registry.filter(row => row.state === "PUBLISHED" && packagePin.some(item => item.key === row.key && item.fingerprint === row.fingerprint)).length;

  async function run(apply: boolean) {
    if (running.current || disabled) return;
    const approvedPlan = plan;
    running.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    setPlan(null);
    try {
      await navigator.locks.request(markerKey, { ifAvailable: true }, async lock => {
        insist(lock, "The release is running in another tab.");
        const states = checkRegistry(await api<Registry>(path));
        readPending(states);
        if (!apply) {
          const verified = [];
          for (const [index, item] of packagePin.entries()) {
            setStatus(`Checking package ${index + 1} of 84 · ${item.key}`);
            const state = states.get(item.key)!;
            await inspect(item, state);
            verified.push({ item, state });
          }
          setPlan(verified);
          setStatus("Release check passed. Existing task versions to change: 0.");
          return;
        }
        insist(approvedPlan?.length === 84 && approvedPlan.every(({ item, state }) => states.get(item.key) === state), "The package states changed. Check the release again.");
        for (const [index, approved] of approvedPlan.entries()) {
          setStatus(`Publishing package ${index + 1} of 84 · ${approved.item.key}`);
          await publish(approved, states.get(approved.item.key)!);
        }
        const finalStates = checkRegistry(await api<Registry>(path));
        insist([...finalStates.values()].every(state => state === "PUBLISHED"), "Some packages are still unpublished. Check the release again.");
        setStatus("All 84 packages are published.");
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message || "The request could not be confirmed." : "The request could not be confirmed.");
      setStatus("");
    } finally {
      running.current = false;
      setBusy(false);
      onBusy(false);
      onRefresh();
    }
  }

  if (published === 84 && !busy) return null;
  return <section className="card stack" aria-labelledby="course-release-title">
    <div><h2 id="course-release-title">Publish 0580, 0606 and 0862</h2>
      <p>{published} of 84 packages published · 17,632 questions · 426 lessons</p></div>
    <div className="table-wrap"><table>
      <thead><tr><th scope="col">Course</th><th scope="col">Packages</th><th scope="col">Questions</th><th scope="col">Lessons</th></tr></thead>
      <tbody>{courses.map(course => <tr key={course.slug}><th scope="row">{course.name}</th><td>{course.packages}</td><td>{course.questions.toLocaleString("en-GB")}</td><td>{course.lessons}</td></tr>)}</tbody>
    </table></div>
    <div className="row">
      <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => void run(false)}>Check release</Button>
      {plan && <Button type="button" variant="primary" disabled={busy || disabled} onClick={() => void run(true)}>Apply and publish remaining packages</Button>}
    </div>
    {status && <p role="status" aria-live="polite">{status}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>;
}
