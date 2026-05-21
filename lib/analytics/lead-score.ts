/**
 * Heuristic lead score for /admin/inbox triage. Pure function — no DB calls.
 * Callers pre-load `priorDelivered` from a single round-trip lookup.
 *
 * Why heuristic, not ML: at this scale (low hundreds of inquiries) a tuned
 * model would over-fit. A transparent rubric is easier to debug + adjust as
 * the operator learns which signals actually predict conversion.
 */
export interface LeadInputs {
  utmSource?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  brief?: string | null;
  createdAt: string;
  priorDeliveredCount?: number;
  /** Override clock for tests. */
  nowMs?: number;
}

export type LeadTier = "cold" | "warm" | "hot";

export interface LeadScore {
  score: number;
  tier: LeadTier;
  reasons: string[];
}

const HOUR_MS = 3600 * 1000;

export function computeLeadScore(input: LeadInputs): LeadScore {
  let score = 0;
  const reasons: string[] = [];
  const now = input.nowMs ?? Date.now();

  if (input.utmSource && input.utmSource.trim().length > 0) {
    score += 1;
    reasons.push(`utm:${input.utmSource}`);
  }
  if (input.utmCampaign && input.utmCampaign.trim().length > 0) {
    score += 1;
    reasons.push(`campaign:${input.utmCampaign}`);
  }
  // Referrer w/o utm = light signal — domain-attributed traffic is more
  // intentional than truly direct.
  if (!input.utmSource && input.referrer) {
    score += 0.5;
    reasons.push("referrer");
  }
  const briefLen = (input.brief ?? "").trim().length;
  if (briefLen >= 200) {
    score += 2;
    reasons.push("detailed-brief");
  } else if (briefLen >= 80) {
    score += 1;
    reasons.push("brief");
  }
  // Fresh inquiries get a small bump so SLAs stay tight.
  const ageMs = now - Date.parse(input.createdAt);
  if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 2 * HOUR_MS) {
    score += 1;
    reasons.push("fresh<2h");
  }
  // Repeat customer is the strongest single signal — bumps tier on its own.
  if ((input.priorDeliveredCount ?? 0) >= 1) {
    score += 2;
    reasons.push(`repeat×${input.priorDeliveredCount}`);
  }

  // Tier thresholds tuned for the 0..7 typical range.
  const tier: LeadTier = score >= 4 ? "hot" : score >= 2 ? "warm" : "cold";
  return { score, tier, reasons };
}

export const TIER_LABEL_KO: Record<LeadTier, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export const TIER_TONE: Record<LeadTier, string> = {
  hot: "bg-red-500/15 text-red-300 border-red-500/30",
  warm: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  cold: "bg-zinc-700/30 text-zinc-400 border-zinc-700",
};
