"use client";

import { useEffect } from "react";
import { snapshotAttribution } from "@/lib/attribution";

/**
 * Mount once in a layout that wraps any page that can be a landing page.
 * It fires `snapshotAttribution()` on initial mount; later navigations
 * within the same session are no-ops because the storage write is sticky.
 */
export default function AttributionSnapshotClient() {
  useEffect(() => {
    snapshotAttribution();
  }, []);
  return null;
}
