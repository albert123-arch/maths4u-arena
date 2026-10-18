"use client";
import { useEffect, useRef } from "react";
import { createStatistics } from "@/lib/platform-statistics.mjs";

export function VisitorStatistics({ path, eligible, language }: { path: string; eligible: boolean; language: string }) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createStatistics> | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const statistics = createStatistics({ container: container.current });
    controller.current = statistics;
    return () => { statistics.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.update({ path, eligible, language }); }, [path, eligible, language]);
  return <div ref={container} hidden />;
}
