"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

interface Props {
  label?: string;
}

export default function ShareLinkButton({
  label = "결과 링크 복사",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API blocked (e.g., http:// non-localhost). Fall back to a
      // prompt so the user can still copy by hand.
      window.prompt("이 링크를 복사하세요:", window.location.href);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          복사됨
        </>
      ) : (
        <>
          <LinkIcon className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </button>
  );
}
