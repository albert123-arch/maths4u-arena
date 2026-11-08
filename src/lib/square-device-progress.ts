import type { CheckEvent, Evidence, QuadraticTopic } from "./square-model";
export type DeviceEvent = CheckEvent & { result: Evidence; claimedBy?: string };
export type SquareDeviceProgress = { version: string; events: DeviceEvent[] };

export function readSquareDevice(raw: string | null, topic: Pick<QuadraticTopic, "version" | "compatibleVersions">): SquareDeviceProgress {
  if (!raw) return { version: topic.version, events: [] };
  const d = JSON.parse(raw) as SquareDeviceProgress;
  if ((d.version !== topic.version && !topic.compatibleVersions?.includes(d.version)) || !Array.isArray(d.events) || d.events.length > 5000 || d.events.some(e => !e || !e.result || typeof e.result.correct !== "boolean" || typeof e.result.helpUsed !== "boolean" || !Number.isFinite(e.result.at) || !e.answers)) throw Error("Device results could not be read. They have not been replaced.");
  return { ...d, version: topic.version };
}

export function firstStoredValue(storage: Pick<Storage, "getItem">, keys: string[]) {
  for (const key of keys) { const value = storage.getItem(key); if (value !== null) return value; }
  return null;
}
