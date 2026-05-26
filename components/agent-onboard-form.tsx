"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";

interface Props {
  initialCompany: string;
  /** False when the current user is an admin — block the apply flow. */
  canApply: boolean;
}

export default function AgentOnboardForm({ initialCompany, canApply }: Props) {
  const router = useRouter();
  const [company, setCompany] = useState(initialCompany);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canApply) {
    return (
      <p className="text-sm text-zinc-400">
        Admin accounts cannot apply as an agency partner from the same login.
      </p>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/agents/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agent_company: company.trim(), notes: notes.trim() || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: string }).error ??
          `Submission failed (${res.status})`
      );
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
          Agency name
        </label>
        <input
          required
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={120}
          placeholder="ACME Creative · WPP / Ogilvy team Seoul"
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Verticals you cover, recent campaigns, anything that helps our reviewer."
          className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || company.trim().length === 0}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        Submit application
      </button>

      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
    </form>
  );
}
