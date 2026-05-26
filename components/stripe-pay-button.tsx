"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  /** Locale-aware label. KR default "Stripe 로 결제", EN "Pay with Stripe". */
  label?: string;
  /** When true, button is hidden (e.g. Stripe disabled at runtime). */
  hidden?: boolean;
  /** Already-paid signal — render an inert "Paid" badge instead. */
  paid?: boolean;
}

/**
 * Opens a Stripe Checkout Session for the quote and navigates the visitor
 * to it. The session is created on the server (auth-bound), so the only
 * thing client-side is the click → fetch → redirect.
 */
export default function StripePayButton({
  projectId,
  label = "Pay with Stripe",
  hidden,
  paid,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  if (paid) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5">
        <CreditCard className="w-3.5 h-3.5" />
        Paid
      </span>
    );
  }

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/quote/${projectId}/checkout`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(
          (data as { error?: string }).error ?? "Checkout failed to start"
        );
        return;
      }
      window.location.assign((data as { url: string }).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={open}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#635bff] text-white text-sm font-medium hover:bg-[#5a52e5] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        {label}
      </button>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </div>
  );
}
