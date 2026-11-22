"use client";

import { useContext, useEffect, useState } from "react";
import { ActorContext, api } from "./ui";
import { useView } from "./view-state";
import type { StudyCheck, StudyCheckpoint, StudyLesson } from "@/lib/study-lesson-model";

type Checkpoints = Record<string, StudyCheckpoint>;
export type StudySessionState = "loading" | "ready" | "device";
const empty: Checkpoints = {};

function readDevice(key: string): Checkpoints {
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  const checks = JSON.parse(raw) as StudyCheckpoint[];
  if (!Array.isArray(checks) || !checks.every(c => typeof c.id === "string" && typeof c.eventKey === "string" &&
    typeof c.correct === "boolean" && typeof c.helpUsed === "boolean" && Number.isFinite(c.checkedAt))) throw new Error("Unreadable checkpoints");
  return Object.fromEntries(checks.map(c => [c.id, c]));
}

function merge(items: Checkpoints, checkpoint: StudyCheckpoint) {
  const latest = items[checkpoint.id];
  return latest && (latest.eventKey === checkpoint.eventKey || latest.checkedAt > checkpoint.checkedAt) ? items : { ...items, [checkpoint.id]: checkpoint };
}

export function checkpointAnchor(id: string) { return "study-check-" + id; }

export function useStudyCheckpoints(lessonId: string, enabled: boolean, session: StudySessionState) {
  const account = useContext(ActorContext), lens = useView();
  const actor = session === "ready" ? account : null;
  const key = `maths4u.study-checks.${lessonId}.v1`;
  const context = `${key}.${actor?.id ?? "guest"}`;
  const [state, setState] = useState<{ context: string; data: Checkpoints }>();
  const [issue, setIssue] = useState<string>();
  const canRecord = enabled && session !== "loading" && !lens;

  useEffect(() => {
    if (!canRecord) return;
    let live = true;
    async function load() {
      try {
        const data = actor ? Object.fromEntries((await api<StudyCheckpoint[]>(`learning/study-check?lessonId=${encodeURIComponent(lessonId)}`)).map(check => [check.id, check])) : readDevice(key);
        if (live) {
          setState(previous => ({ context, data: previous?.context === context ? Object.values(previous.data).reduce(merge, data) : data }));
          setIssue(previous => previous === context ? undefined : previous);
        }
      } catch { if (live) setIssue(context); }
    }
    void load();
    return () => { live = false; };
  }, [actor, canRecord, context, key, lessonId]);

  function record(checkpoint: StudyCheckpoint) {
    setState(previous => ({ context, data: merge(previous?.context === context ? previous.data : empty, checkpoint) }));
    if (actor) return;
    try {
      localStorage.setItem(key, JSON.stringify(Object.values(merge(readDevice(key), checkpoint))));
      setIssue(previous => previous === context ? undefined : previous);
    }
    catch { setIssue(context); }
  }
  return { checks: canRecord && state?.context === context ? state.data : empty, record: canRecord ? record : undefined, issue: issue === context };
}

export function StudyCheckpointReview({ study, checks }: { study: StudyLesson; checks: Checkpoints }) {
  const available: StudyCheck[] = [
    ...study.sections.flatMap(section => section.blocks.filter(block => block.kind === "check")),
    ...(study.extraPractice ?? []),
    ...(study.previousChecks ?? []),
  ];
  const due = available.filter(check => { const result = checks[check.id]; return result && (!result.correct || result.helpUsed); });
  if (!due.length) return null;
  return <div className="stack" aria-label="Topic checkpoints ready for review">
    <h3>Review from Your turn</h3>
    <p>{due.length} {due.length === 1 ? "checkpoint is" : "checkpoints are"} ready to retry. Try each again without a hint.</p>
    <ul>{due.map(check => <li key={check.id}>
      <a href={"#" + checkpointAnchor(check.id)} onClick={() => {
        const details = document.getElementById(checkpointAnchor(check.id))?.closest("details");
        if (details) details.open = true;
      }}>{check.title ?? check.fields[0].label}</a>{" · "}{checks[check.id].correct ? "Answered with a hint" : "Needs another try"}
    </li>)}</ul>
  </div>;
}
