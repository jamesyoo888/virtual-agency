"use client";

import { Printer } from "lucide-react";

export default function PrintButton({
  label = "인쇄 · PDF 저장",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
    >
      <Printer className="w-4 h-4" />
      {label}
    </button>
  );
}
