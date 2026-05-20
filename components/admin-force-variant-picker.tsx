"use client";

import { useState } from "react";

/**
 * Inline picker on /admin/experiments. Sets the admin's *own* sticky cookie
 * to a chosen variant for the linked experiment, and flags the session as a
 * dry-run so funnel writes are skipped. Affects nothing outside this admin's
 * browser.
 */
export default function ForceVariantPicker({
  experimentKey,
  variants,
}: {
  experimentKey: string;
  variants: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function setVariant(v: string | null) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/experiments/force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: experimentKey, variant: v }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActive(v);
      setMsg(v ? `${v} pinned (dry-run)` : "cleared");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-zinc-500 mr-1">force:</span>
      {variants.map((v) => {
        const isActive = active === v;
        return (
          <button
            key={v}
            type="button"
            disabled={busy}
            onClick={() => setVariant(v)}
            className={
              isActive
                ? "px-2 py-1 rounded border border-amber-600 text-amber-300 bg-amber-950/40 disabled:opacity-50"
                : "px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
            }
          >
            {v}
          </button>
        );
      })}
      <button
        type="button"
        disabled={busy}
        onClick={() => setVariant(null)}
        className="px-2 py-1 rounded border border-transparent text-zinc-500 hover:text-zinc-200 disabled:opacity-50"
      >
        clear
      </button>
      {msg && <span className="ml-2 text-zinc-500" aria-live="polite">{msg}</span>}
    </div>
  );
}
