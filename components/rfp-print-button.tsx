"use client";

import { Printer } from "lucide-react";

export default function RfpPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
    >
      <Printer className="w-4 h-4" />
      인쇄 / PDF 저장
    </button>
  );
}
