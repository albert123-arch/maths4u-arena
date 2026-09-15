// Keep request bodies bounded and leave pool capacity for ordinary site traffic.
// Pause/failure waits for active uploads, so a resume cannot race a prior queue.
export async function bankUploadQueue<T>(items: readonly T[], upload: (item: T) => Promise<void>, stopped: () => boolean): Promise<boolean> {
  let cursor = 0, failed = false, failure: unknown;
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (!failed && !stopped()) {
      const index = cursor++;
      if (index >= items.length) return;
      try { await upload(items[index]); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    }
  }));
  if (failed) throw failure;
  return !stopped();
}
