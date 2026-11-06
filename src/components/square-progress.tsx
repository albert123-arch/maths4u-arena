"use client";
import { Button, ButtonLink } from "./controls";
/* eslint-disable react-hooks/set-state-in-effect -- Restore device/account state after hydration; never read localStorage during SSR. */
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ActorContext, api, ErrorNotice } from "./ui";
import { useView } from "./view-state";
import { quadraticTopic, quadraticTopics, type QuadraticTopic, squareSnapshot, type SquareSnapshot, type CheckEvent, type CheckResult, type Evidence } from "@/lib/square-model";


type DeviceEvent = CheckEvent & { result: Evidence; claimedBy?: string };
type Device = { version: string; events: DeviceEvent[] };
const empty = () => squareSnapshot([]);
export function useReviewNow() {
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = setInterval(tick, 60000); window.addEventListener("focus", tick); return () => { clearInterval(timer); window.removeEventListener("focus", tick); }; }, []);
  return now;
}
function read(topic: QuadraticTopic): Device {
  const key = topic.storage + ".guest.v1", squareVersion = topic.version;
  const raw = localStorage.getItem(key); if (!raw) return { version: squareVersion, events: [] };
  const d = JSON.parse(raw) as Device;
  if (d.version !== squareVersion || !Array.isArray(d.events) || d.events.length > 5000 || d.events.some(e => !e || !e.result || typeof e.result.correct !== "boolean" || typeof e.result.helpUsed !== "boolean" || !Number.isFinite(e.result.at) || !e.answers)) throw Error("Device results could not be read. They have not been replaced.");
  return d;
}
export function useSquareProgress(sessionReady: boolean, topic: QuadraticTopic = quadraticTopic()) {
  const lens = useView();
  const key = topic.storage + ".guest.v1", squareVersion = topic.version;
  const actor = useContext(ActorContext), [snapshot, setSnapshot] = useState<SquareSnapshot>(empty), [ready, setReady] = useState(false), [error, setError] = useState<unknown>(null), [storageIssue, setStorageIssue] = useState(false), [pending, setPending] = useState(0), [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (!sessionReady) return;
    let live = true; setReady(false); setError(null);
    async function load() {
      let device: Device = { version: squareVersion, events: [] };
      try { if (!lens) device = read(topic); } catch { if (live) setStorageIssue(true); }
      if (live) setPending(actor ? device.events.filter(e => !e.claimedBy).length : 0);
      try { const s = lens?.mode === "ROLE" ? empty() : actor ? await api<SquareSnapshot>(topic.api + "/progress") : squareSnapshot(device.events.map(e => e.result)); if (live) setSnapshot(s); }
      catch(e) { if (live) setError(e); } finally { if (live) setReady(true); }
    }
    void load(); return () => { live = false; };
  }, [actor?.id, sessionReady, topic.key]); // eslint-disable-line react-hooks/exhaustive-deps
  async function record(event: CheckEvent, family: string, result: CheckResult) {
    if (actor && !lens) { setSnapshot(await api<SquareSnapshot>(topic.api + "/progress")); return; }
    const evidence = { eventKey: event.eventKey, uid: event.uid, family, correct: result.correct, helpUsed: event.helpUsed, at: event.at };
    setSnapshot(s => squareSnapshot([...s.evidence.filter(e => e.eventKey !== event.eventKey), evidence]));
    if (lens) return;
    try { const d = read(topic); if (d.events.length >= 5000) throw Error("Device full"); if (!d.events.some(e => e.eventKey === event.eventKey)) d.events.push({ ...event, result: evidence }); localStorage.setItem(key, JSON.stringify(d)); }
    catch { setStorageIssue(true); }
  }
  async function sync() {
    if (!actor || lens) return; setSyncing(true); setError(null);
    try {
      const d = read(topic), pending = d.events.filter(e => !e.claimedBy);
      let s = snapshot;
      for (let i = 0; i < pending.length; i += 100) {
        const batch = pending.slice(i, i + 100);
        s = await api<SquareSnapshot>(topic.api + "/import", "POST", { version: squareVersion, events: batch.map(({ eventKey, uid, answers, helpUsed, at }) => ({ eventKey, uid, answers, helpUsed, at })) });
        // Keep device evidence. The claim marker prevents accidental import into a different account.
        for (const e of batch) e.claimedBy = actor.id;
        localStorage.setItem(key, JSON.stringify(d));
      }
      setSnapshot(s); setPending(0);
    } catch(e) { setError(e); } finally { setSyncing(false); }
  }
  async function markRead() {
    if (lens) return;
    setError(null);
    try { await api("lessons/" + topic.lessonId + "/progress", "POST", { completed: true }); setSnapshot(s=>({...s,notesRead:true})); }
    catch(e) { setError(e); }
  }
  return { topic, snapshot, ready, record, error, storageIssue, pending, sync, syncing, markRead };
}
export function SquareSaveNotice({ state }: { state: ReturnType<typeof useSquareProgress> }) {
  const lens = useView();
  const actor = useContext(ActorContext);
  if (lens) return <p className="notice">{lens.mode === "ROLE" ? "Preview only. Answers and progress are not saved." : "Read only. This is the user’s saved learning history."}</p>;
  return <div className="square-save"><ErrorNotice error={state.error} />
    {state.storageIssue && <p role="alert">Device storage is unavailable or could not be read. Your result is shown here, but may not survive closing this page. Existing stored data has not been erased.</p>}
    {!actor ? <p>Progress stays in this browser. <Link href={"/register?next=" + encodeURIComponent(state.topic.path)}>Create an account to save it</Link> or <Link href={"/login?next=" + encodeURIComponent(state.topic.path)}>sign in</Link>.</p> : state.pending ? <p>{state.pending} guest checks are stored on this device. <Button className="secondary" disabled={state.syncing} onClick={() => void state.sync()}>{state.syncing ? "Saving…" : "Save these guest results to my account"}</Button> <small>Use this only for your own work on a shared device.</small></p> : <p>New checks are saved to your account. These are practice results, not class grades.</p>}
  </div>;
}
export function SquareReviewCard({ sessionReady, topic = quadraticTopic(), hideUntouched = false }: { sessionReady: boolean; topic?: QuadraticTopic; hideUntouched?: boolean }) {
  const state = useSquareProgress(sessionReady, topic), actor = useContext(ActorContext), states = Object.entries(state.snapshot.states).filter(([family]) => new RegExp("-S-" + topic.code + "\\d\\d$").test(family)).map(([,s])=>s), clock = useReviewNow(), now = Math.max(clock, ...states.map(s => s.checkedAt), 0), due = states.filter(s => s.dueAt <= now).length;
  if (!state.ready) return null;
  if ((!actor || hideUntouched) && !state.snapshot.evidence.length && !state.storageIssue) return null;
  return <section className="card square-review-card"><p className="eyebrow">9709 · Pure Mathematics 1</p><h2>Review · {topic.title}</h2>
    <p>{!states.length ? "Start with a quick check. Your review plan will use your own answers." : due ? `${due} ${due === 1 ? "skill is" : "skills are"} ready for review. Try a fresh variant.` : "Nothing is due now. Your next review is " + new Date(Math.min(...states.map(s => s.dueAt))).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + "."}</p>
    <ButtonLink className="button" href={topic.path + (due ? "?review=1#practice" : "#practice")}>{due ? "Review now" : "Continue practice"} →</ButtonLink><SquareSaveNotice state={state} />
  </section>;
}

export function QuadraticsReviewCards({sessionReady}: {sessionReady: boolean}) { return <><section className="card"><h2>Quadratics · Your learning route</h2><p>Choose a topic to learn, practise or continue. Reviews appear below after your first checks.</p><nav className="quadratics-topics" aria-label="Quadratics topics">{quadraticTopics.map(t=><Link key={t.key} href={t.path}>{t.title} →</Link>)}</nav></section>{quadraticTopics.map(t=><SquareReviewCard key={t.key} sessionReady={sessionReady} topic={t} hideUntouched />)}</>; }
