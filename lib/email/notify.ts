/**
 * High-level notification helpers — call these from route handlers and admin
 * actions. Each helper:
 *  - resolves the recipient (and short-circuits if the email is missing);
 *  - renders the template;
 *  - awaits `sendEmail()` but swallows provider errors so a failed email
 *    never breaks the underlying business action (status change, accept,
 *    etc.). Errors are logged to the server console; surface them in a
 *    proper observability stack once Resend/SES is wired up.
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
  vars: InquiryReceivedVars
) {
  return safeSend(to, inquiryReceived(vars), {
    kind: "inquiry_received",
    project: vars.projectId,
  });
}

export async function notifyStatusChanged(
  to: string | null | undefined,
  vars: StatusChangedVars
) {
  if (vars.from === vars.to) {
    return { ok: false, provider: "none", skipped: true, error: "no-op status" };
  }
  return safeSend(to, statusChanged(vars), {
    kind: "status_changed",
    project: vars.projectId,
    to_status: vars.to,
  });
}

export async function notifyQuoteReady(
  to: string | null | undefined,
  vars: QuoteReadyVars
) {
  return safeSend(to, quoteReady(vars), {
    kind: "quote_ready",
    project: vars.projectId,
  });
}

export async function notifyReferralThanks(
  to: string | null | undefined,
  vars: ReferralThanksVars & { referrerId: string }
) {
  return safeSend(to, referralThanks(vars), {
    kind: "referral_thanks",
    referrer: vars.referrerId,
  });
}

export async function notifyInquiryFollowup(
  to: string | null | undefined,
  vars: InquiryFollowupVars
) {
  return safeSend(to, inquiryFollowup(vars), {
    kind: "inquiry_followup",
    project: vars.projectId,
  });
}

export async function notifyWeeklyDigest(
  to: string | null | undefined,
  vars: DigestVars & { clientId: string }
) {
  return safeSend(to, weeklyDigest(vars), {
    kind: "weekly_digest",
    client: vars.clientId,
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
