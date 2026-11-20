"use client";

import { Button } from "./controls";

export function PrintRevision() {
  return <Button variant="primary" onClick={() => window.print()}>Print / Save as PDF</Button>;
}
