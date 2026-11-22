"use client";

import { useRef, useState } from "react";
import type { contentPackageStatus, planContentPackage } from "@/lib/content-packages";
import { Button } from "./controls";
import { api, ApiError } from "./ui";
import packagePin from "./content-revisions-20261122-pin.json";

type Registry = Awaited<ReturnType<typeof contentPackageStatus>>;
type Package = (typeof packagePin)[number];
type Report = Awaited<ReturnType<typeof planContentPackage>>;
type PackageState = "pending" | "updated";

const path = "admin/content-packages";
const releaseLock = "arena-content-revisions-20261122";
const recoveryTime = 300_000;

function insist(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkRegistry(rows: Registry) {
  insist(packagePin.length === 18 && new Set(packagePin.map(item => item.key)).size === 18 &&
    packagePin.reduce((sum, item) => sum + item.questions, 0) === 1683 &&
    packagePin.reduce((sum, item) => sum + item.lessonChanges, 0) === 2, "The approved release counts do not match.");
  const registry = new Map(rows.map(row => [row.key, row]));
  const states = new Map<string, PackageState>();
  for (const item of packagePin) {
    const row = registry.get(item.key);
    insist(row && row.version === item.version && row.fingerprint === item.fingerprint && row.coursePath === `/courses/${item.courseSlug}` &&
      row.questions === item.questions && row.lessons.length === item.lessons.length &&
      row.lessons.every((lesson, index) => lesson.id === item.lessons[index]), `${item.key} does not match the reviewed package.`);
    insist(row.state === "PUBLISHED" && row.installedReceiptMatches, `${item.key} has no verified published installation.`);
    if (row.installedVersion === item.version && row.installedFingerprint === item.fingerprint) states.set(item.key, "updated");
    else {
      insist(row.installedVersion === item.previous.version && row.installedFingerprint === item.previous.fingerprint,
        `${item.key} has an unexpected installed version.`);
      states.set(item.key, "pending");
    }
  }
  return states;
}

function checkReport(report: Report, item: Package, state: PackageState, applied = false) {
  const pending = state === "pending";
  const expected = pending ? item.previous : item;
  insist(report.key === item.key && report.version === item.version && report.fingerprint === item.fingerprint &&
    report.state === (applied ? "APPLIED" : pending ? "DRY_RUN" : "ALREADY_APPLIED"), `${item.key} returned an unexpected result.`);
  insist(report.installed?.state === "PUBLISHED" && report.installed.version === expected.version && report.installed.fingerprint === expected.fingerprint,
    `${item.key} changed its installed version or publication state.`);
  insist(report.create === 0 && report.update === (pending ? item.questions : 0) && report.skip === (pending ? 0 : item.questions) &&
    report.lessonChanges === (pending ? item.lessonChanges : 0), `${item.key} would change a different set of records than approved.`);
  insist(!pending || /^[a-f0-9]{64}$/.test(report.token), `${item.key} has no valid dry-run token.`);
}

async function inspect(item: Package, state: PackageState) {
  const report = await api<Report>(`${path}/${item.key}/dry-run`, "POST");
  checkReport(report, item, state);
  return report;
}

function checkPreviousRequest(states: Map<string, PackageState>) {
  const saved = localStorage.getItem(releaseLock);
  if (!saved) return;
  const { key, until } = JSON.parse(saved) as { key: string; until: number };
  insist(states.has(key) && Number.isSafeInteger(until), "The previous release request could not be identified.");
  const seconds = Math.ceil((until - Date.now()) / 1000);
  insist(states.get(key) === "updated" || seconds <= 0, `${key} may still be processing. Check again in ${seconds} seconds.`);
  localStorage.removeItem(releaseLock);
}

class UnconfirmedApply extends Error {}

async function apply(item: Package, token: string) {
  localStorage.setItem(releaseLock, JSON.stringify({ key: item.key, until: Date.now() + recoveryTime }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      api<Report>(`${path}/${item.key}/apply`, "POST", { token }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new UnconfirmedApply()), 220_000); }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500 && error.status !== 408 && error.code !== "UNEXPECTED_SERVER_RESPONSE") {
      localStorage.removeItem(releaseLock);
      throw error;
    }
    throw new UnconfirmedApply(`${item.key} may still be processing.`);
  } finally { clearTimeout(timer); }
}

async function confirmApply(item: Package) {
  const deadline = Date.now() + 60_000;
  do {
    const registry = checkRegistry(await api<Registry>(path));
    if (registry.get(item.key) === "updated") {
      await inspect(item, "updated");
      return;
    }
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 5000));
  } while (true);
  throw new Error(`${item.key} has not confirmed the update. Check the release again once the request has finished.`);
}

async function updatePackage(item: Package) {
  const { token } = await inspect(item, "pending");
  try {
    const applied = await apply(item, token);
    checkReport(applied, item, "pending", true);
  } catch (error) {
    if (!(error instanceof UnconfirmedApply)) throw error;
    await confirmApply(item);
  }
  localStorage.removeItem(releaseLock);
}

export function ContentRevisions20261122({ registry, onBusy, onRefresh, disabled }: { registry: Registry; onBusy: (busy: boolean) => void; onRefresh: () => void; disabled: boolean }) {
  const [plan, setPlan] = useState<Map<string, PackageState> | null>(null);
  const [mode, setMode] = useState<"check" | "apply" | null>(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const running = useRef(false);
  const pause = useRef(false);
  const updated = packagePin.filter(item => registry.some(row => row.key === item.key && row.state === "PUBLISHED" && row.installedReceiptMatches &&
    row.version === item.version && row.fingerprint === item.fingerprint && row.installedVersion === item.version && row.installedFingerprint === item.fingerprint)).length;

  async function run(nextMode: "check" | "apply") {
    if (running.current || disabled) return;
    const approved = plan;
    running.current = true;
    pause.current = false;
    setMode(nextMode);
    setPaused(false);
    onBusy(true);
    setError("");
    setPlan(null);
    try {
      await navigator.locks.request(releaseLock, { ifAvailable: true }, async lock => {
        insist(lock, "The release is open in another tab.");
        const states = checkRegistry(await api<Registry>(path));
        checkPreviousRequest(states);
        if (nextMode === "check") {
          for (const [index, item] of packagePin.entries()) {
            setStatus(`Checking chapter ${index + 1} of 18 · ${item.key}`);
            await inspect(item, states.get(item.key)!);
          }
          const remaining = packagePin.filter(item => states.get(item.key) === "pending");
          setPlan(states);
          setStatus(`Release check passed. ${remaining.length} chapters ready, with ${remaining.reduce((sum, item) => sum + item.questions, 0).toLocaleString("en-GB")} new question versions and zero new question IDs.`);
          return;
        }
        insist(approved?.size === 18 && [...states.entries()].every(([key, state]) => approved.get(key) === state), "The installed versions changed. Check the release again.");
        for (const [index, item] of packagePin.entries()) {
          if (pause.current) break;
          if (states.get(item.key) === "updated") continue;
          setStatus(`Updating chapter ${index + 1} of 18 · ${item.key}`);
          await updatePackage(item);
        }
        const finalStates = checkRegistry(await api<Registry>(path));
        const updatedTotal = [...finalStates.values()].filter(state => state === "updated").length;
        insist(pause.current || updatedTotal === 18, "Some chapters still need the update. Check the release again.");
        setStatus(updatedTotal === 18 ? "All 18 chapters are updated and published." : `${updatedTotal} of 18 chapters updated. Check the release to resume.`);
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message || "The request could not be confirmed." : "The request could not be confirmed.");
      setStatus("");
    } finally {
      running.current = false;
      setMode(null);
      onBusy(false);
      onRefresh();
    }
  }

  if (updated === 18 && !mode) return null;
  return <section className="card stack" aria-labelledby="content-revisions-title">
    <div><h2 id="content-revisions-title">Apply the 9709 and 9231 corrections</h2>
      <p>{updated} of 18 published chapters updated · 1,683 question versions · 2 lesson versions</p></div>
    <div className="row">
      <Button type="button" variant="outline" disabled={!!mode || disabled} onClick={() => void run("check")}>Check corrections</Button>
      {plan && <Button type="button" variant="primary" disabled={!!mode || disabled} onClick={() => void run("apply")}>Apply remaining corrections</Button>}
      {mode === "apply" && <Button type="button" variant="outline" disabled={paused} onClick={() => { pause.current = true; setPaused(true); }}>Pause after this chapter</Button>}
    </div>
    {status && <p role="status" aria-live="polite">{status}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>;
}
