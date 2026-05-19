"use client";

import { useEffect } from "react";

/**
 * Wires the RFP page chip buttons (no JS framework, just delegated clicks) so
 * each `data-rfp-chips=<name>` group toggles its sibling hidden CSV input.
 * Mirrors the pattern in `/match` but isolated to one client component.
 */
export default function RfpFilterChips() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const chip = target?.closest<HTMLButtonElement>("button[data-rfp-chip-name]");
      if (!chip) return;
      const name = chip.dataset.rfpChipName!;
      const value = chip.dataset.rfpChipValue!;
      const input = document.querySelector<HTMLInputElement>(
        `input[type=hidden][name="${name}"][data-rfp-chips-target]`
      );
      if (!input) return;

      const values = (input.value || "").split(",").filter(Boolean);
      const idx = values.indexOf(value);
      const next = idx >= 0 ? values.filter((_, i) => i !== idx) : [...values, value];
      input.value = next.join(",");
      const active = idx < 0;
      chip.dataset.rfpChipActive = String(active);
      chip.className = active
        ? "px-2.5 py-1 text-xs rounded-full border transition-colors bg-white text-black border-white"
        : "px-2.5 py-1 text-xs rounded-full border transition-colors bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500";
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
