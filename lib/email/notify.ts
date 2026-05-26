/**
 * High-level notification helpers — call these from route handlers and admin
 * actions. Each helper:
 *  - resolves the recipient (and short-circuits if the email is missing);
 *  - dispatches to either Korean (templates.ts) or English (templates-en.ts)
 *    renderers based on the `locale` argument (default "ko");
 *  - awaits `sendEmail()` but swallows provider errors so a failed email
 *    never breaks the underlying business action (status change, accept,
 *    etc.). Errors are logged to the server console; surface them in a
 *    proper observability stack once Resend/SES is wired up.
 *
 * Locale source: callers should pass `client.locale` (clients.locale column,
 * migration 026). When that column is missing for a row (older clients), the
 * default is "ko" so behavior matches what was shipped before Wave 103.
 */

import { sendEmail, type EmailSendResult } from "./provider";
import {
  inquiryReceived,
  statusChanged,
  quoteReady,
  weeklyDigest,
  inquiryFollowup,
  referralThanks,
  type InquiryReceivedVars,
  type StatusChangedVars,
  type QuoteReadyVars,
  type DigestVars,
  type InquiryFollowupVars,
  type ReferralThanksVars,
} from "./templates";
import {
  inquiryReceivedEn,
  statusChangedEn,
  quoteReadyEn,
  weeklyDigestEn,
  inquiryFollowupEn,
  referralThanksEn,
  type InquiryReceivedEnVars,
  type StatusChangedEnVars,
  type QuoteReadyEnVars,
  type DigestEnVars,
  type InquiryFollowupEnVars,
  type ReferralThanksEnVars,
} from "./templates-en";

export type EmailLocale = "ko" | "en";

async function safeSend(
  to: string | null | undefined,
  rendered: { subject: string; html: string; text: string },
  tags: Record<string, string>
): Promise<EmailSendResult> {
  if (!to) {
    return { ok: false, provider: "none", skipped: true, error: "missing recipient" };
  }
  try {
    const result = await sendEmail({ to, ...rendered, tags });
    if (!result.ok) {
      console.warn(`[email:notify] ${tags.kind} failed: ${result.error}`);
    }
    return result;
  } catch (err) {
    console.error(`[email:notify] ${tags.kind} threw`, err);
    return {
      ok: false,
      provider: "unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function notifyInquiryReceived(
  to: string | null | undefined,
  vars: InquiryReceivedVars,
  locale: EmailLocale = "ko"
) {
  const rendered =
    locale === "en"
      ? inquiryReceivedEn(vars as InquiryReceivedEnVars)
      : inquiryReceived(vars);
  return safeSend(to, rendered, {
    kind: "inquiry_received",
    project: vars.projectId,
    locale,
  });
}

export async function notifyStatusChanged(
  to: string | null | undefined,
  vars: StatusChangedVars,
  locale: EmailLocale = "ko"
) {
  if (vars.from === vars.to) {
    return { ok: false, provider: "none", skipped: true, error: "no-op status" };
  }
  const rendered =
    locale === "en"
      ? statusChangedEn(vars as StatusChangedEnVars)
      : statusChanged(vars);
  return safeSend(to, rendered, {
    kind: "status_changed",
    project: vars.projectId,
    to_status: vars.to,
    locale,
  });
}

export async function notifyQuoteReady(
  to: string | null | undefined,
  vars: QuoteReadyVars & Partial<QuoteReadyEnVars>,
  locale: EmailLocale = "ko"
) {
  // EN variant uses amountCents + currency (USD/EUR/SGD/GBP). KO variant uses
  // amount in KRW (whole won). If a caller passes locale="en" without the EN
  // fields we fall through to KO to avoid producing a malformed card.
  if (locale === "en" && vars.amountCents != null && vars.currency) {
    return safeSend(
      to,
      quoteReadyEn({
        clientName: vars.clientName,
        modelName: vars.modelName,
        projectTitle: vars.projectTitle,
        projectId: vars.projectId,
        amountCents: vars.amountCents,
        currency: vars.currency,
      }),
      { kind: "quote_ready", project: vars.projectId, locale }
    );
  }
  return safeSend(to, quoteReady(vars), {
    kind: "quote_ready",
    project: vars.projectId,
    locale: "ko",
  });
}

export async function notifyReferralThanks(
  to: string | null | undefined,
  vars: ReferralThanksVars & { referrerId: string },
  locale: EmailLocale = "ko"
) {
  const rendered =
    locale === "en"
      ? referralThanksEn(vars as ReferralThanksEnVars)
      : referralThanks(vars);
  return safeSend(to, rendered, {
    kind: "referral_thanks",
    referrer: vars.referrerId,
    locale,
  });
}

export async function notifyInquiryFollowup(
  to: string | null | undefined,
  vars: InquiryFollowupVars,
  locale: EmailLocale = "ko"
) {
  const rendered =
    locale === "en"
      ? inquiryFollowupEn(vars as InquiryFollowupEnVars)
      : inquiryFollowup(vars);
  return safeSend(to, rendered, {
    kind: "inquiry_followup",
    project: vars.projectId,
    locale,
  });
}

export async function notifyWeeklyDigest(
  to: string | null | undefined,
  vars: DigestVars & Partial<DigestEnVars> & { clientId: string },
  locale: EmailLocale = "ko"
) {
  if (locale === "en") {
    // Build EN payload from the union. `active[*].status_en` is the EN status
    // label — the digest builder must populate it when client.locale === "en".
    const enActive = vars.active.map((p) => ({
      id: p.id,
      title: p.title,
      // Fall back to the KR label as a safety net rather than emit a blank.
      status_en: (p as { status_en?: string }).status_en ?? p.status_ko,
      modelName: p.modelName,
      isRecent: p.isRecent,
    }));
    return safeSend(
      to,
      weeklyDigestEn({
        clientName: vars.clientName,
        active: enActive,
        recentChangesCount: vars.recentChangesCount,
        deliveredCount: vars.deliveredCount,
      }),
      { kind: "weekly_digest", client: vars.clientId, locale }
    );
  }
  return safeSend(to, weeklyDigest(vars), {
    kind: "weekly_digest",
    client: vars.clientId,
    locale: "ko",
  });
}

export interface AdminSummaryEmailVars {
  subject: string;
  html: string;
  text: string;
}

/**
 * Internal ops summary — sent to admin users, not clients. The cron handler
 * pre-renders subject/html/text so this helper is a thin pass-through.
 */
export async function notifyAdminWeeklySummary(
  to: string | null | undefined,
  vars: AdminSummaryEmailVars
) {
  return safeSend(
    to,
    { subject: vars.subject, html: vars.html, text: vars.text },
    { kind: "admin_weekly_summary" }
  );
}
