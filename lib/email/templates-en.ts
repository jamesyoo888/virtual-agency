/**
 * English mirrors of templates.ts. Same data shape (`RenderedEmail`), so a
 * caller can switch on `locale` without restructuring its pipeline.
 *
 * Wiring strategy (deferred to a later wave): clients written via /en/*
 * surfaces get a `locale: "en"` field on the clients row; the notify/digest
 * dispatchers pick this file when locale === "en", otherwise fall through to
 * the Korean templates. Until that wiring lands, these renderers are
 * accessible to any caller that already knows the recipient's locale.
 */
import type { RenderedEmail } from "./templates";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://virtual-agency-murex.vercel.app";

const STATUS_EN: Record<string, string> = {
  inquiry: "Inquiry received",
  brief_received: "Brief received",
  in_progress: "In production",
  review: "Under review",
  delivered: "Delivered",
};

const STATUS_NOTE_EN: Record<string, string> = {
  inquiry: "An account manager will reply within 24 hours.",
  brief_received: "We are reviewing your brief and starting production.",
  in_progress: "Production is underway. You can track stage progress in your dashboard.",
  review: "Deliverables are ready for your review in the dashboard.",
  delivered: "Final deliverables are available for download.",
};

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;padding:24px;background:#0a0a0a;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:28px;">
    ${body}
    <hr style="border:0;border-top:1px solid #27272a;margin:24px 0">
    <p style="color:#71717a;font-size:12px;margin:0">Virtual Agency · <a href="${BASE_URL}/en" style="color:#a1a1aa">${BASE_URL.replace(/^https?:\/\//, "")}/en</a></p>
    <p style="color:#52525b;font-size:10px;margin:8px 0 0">All Virtual Agency talent is AI-generated synthetic — see <a href="${BASE_URL}/en/legal/ai-disclosure" style="color:#71717a">disclosure</a>.</p>
  </div>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InquiryReceivedEnVars {
  clientName?: string | null;
  modelName: string;
  projectTitle: string;
  brief?: string | null;
  projectId: string;
}

export function inquiryReceivedEn(vars: InquiryReceivedEnVars): RenderedEmail {
  const greet = vars.clientName ? `Hi ${vars.clientName},` : "Hello,";
  const url = `${BASE_URL}/client/dashboard`;
  const subject = `[Virtual Agency] We received your inquiry — ${vars.modelName}`;

  const text =
    `${greet}\n\nThanks for your inquiry about ${vars.modelName}. ` +
    `An account manager will get back to you within 24 hours.\n\n` +
    `Project: ${vars.projectTitle}\n` +
    (vars.brief ? `Brief:\n${vars.brief}\n\n` : "\n") +
    `Dashboard: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">Inquiry received</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} Thanks for your inquiry about <strong style="color:#fafafa">${escape(vars.modelName)}</strong>. An account manager will reply within 24 hours.</p>
<div style="background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:14px 16px;margin:0 0 18px">
  <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Project</p>
  <p style="margin:0;color:#e4e4e7;font-weight:500">${escape(vars.projectTitle)}</p>
${
  vars.brief
    ? `<p style="margin:12px 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Brief</p>
<p style="margin:0;white-space:pre-wrap;color:#d4d4d8">${escape(vars.brief)}</p>`
    : ""
}
</div>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Open dashboard</a></p>`
  );

  return { subject, html, text };
}

export interface StatusChangedEnVars {
  clientName?: string | null;
  modelName: string | null;
  projectTitle: string;
  projectId: string;
  from: string;
  to: string;
}

export function statusChangedEn(vars: StatusChangedEnVars): RenderedEmail {
  const greet = vars.clientName ? `Hi ${vars.clientName},` : "Hello,";
  const fromLabel = STATUS_EN[vars.from] ?? vars.from;
  const toLabel = STATUS_EN[vars.to] ?? vars.to;
  const note = STATUS_NOTE_EN[vars.to] ?? "";
  const url = `${BASE_URL}/client/dashboard`;
  const modelPart = vars.modelName ? `${vars.modelName} · ` : "";
  const subject = `[Virtual Agency] ${modelPart}${vars.projectTitle} — ${toLabel}`;

  const text =
    `${greet}\n\nProject "${vars.projectTitle}" status changed.\n\n` +
    `Previous: ${fromLabel}\nCurrent: ${toLabel}\n\n${note}\n\nDashboard: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">Project status updated</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} Project "<strong style="color:#fafafa">${escape(vars.projectTitle)}</strong>" status has changed.</p>
<div style="background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:14px 16px;margin:0 0 18px">
  <p style="margin:0 0 6px;color:#71717a;font-size:13px">${escape(fromLabel)} <span style="color:#52525b">→</span> <strong style="color:#fafafa">${escape(toLabel)}</strong></p>
  ${note ? `<p style="margin:8px 0 0;color:#d4d4d8;font-size:13px">${escape(note)}</p>` : ""}
</div>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Open dashboard</a></p>`
  );

  return { subject, html, text };
}

export interface QuoteReadyEnVars {
  clientName?: string | null;
  modelName: string;
  projectTitle: string;
  projectId: string;
  /** Amount in cents (USD/EUR/SGD) — formatted to two decimal places. */
  amountCents: number;
  currency: string;
}

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  EUR: "en-IE",
  SGD: "en-SG",
  GBP: "en-GB",
};

export function quoteReadyEn(vars: QuoteReadyEnVars): RenderedEmail {
  const greet = vars.clientName ? `Hi ${vars.clientName},` : "Hello,";
  const url = `${BASE_URL}/client/quote/${vars.projectId}`;
  const subject = `[Virtual Agency] Your quote for ${vars.modelName} is ready`;
  const locale = CURRENCY_LOCALE[vars.currency] ?? "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: vars.currency,
  }).format(vars.amountCents / 100);

  const text =
    `${greet}\n\nYour quote for ${vars.modelName} ("${vars.projectTitle}") is ready.\n\n` +
    `Total: ${formatted} (taxes calculated at checkout)\n\nQuote: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">Your quote is ready</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} Your quote for <strong style="color:#fafafa">${escape(vars.modelName)}</strong> ("${escape(vars.projectTitle)}") is ready.</p>
<p style="margin:0 0 18px;color:#fafafa;font-size:22px;font-weight:600">${escape(formatted)}<span style="color:#71717a;font-size:13px;font-weight:400"> (taxes calculated at checkout)</span></p>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">View quote</a></p>`
  );

  return { subject, html, text };
}

export interface InquiryFollowupEnVars {
  clientName?: string | null;
  modelName: string | null;
  projectTitle: string;
  projectId: string;
  daysSinceInquiry: number;
}

export function inquiryFollowupEn(vars: InquiryFollowupEnVars): RenderedEmail {
  const greet = vars.clientName ? `Hi ${vars.clientName},` : "Hello,";
  const url = `${BASE_URL}/client/dashboard`;
  const modelPart = vars.modelName ? ` ${vars.modelName} model` : "";
  const subject = `[Virtual Agency] Checking in on your inquiry`;

  const text =
    `${greet}\n\nYour inquiry about${modelPart} for "${vars.projectTitle}" came in ${vars.daysSinceInquiry} days ago ` +
    `and has not moved past the brief stage. If you need more information or want to reset the priority, ` +
    `reply in the dashboard and an account manager will follow up within 24 hours.\n\n` +
    `Dashboard: ${url}\n`;

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">Need help moving this forward?</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)} Your inquiry for "<strong style="color:#fafafa">${escape(vars.projectTitle)}</strong>"${modelPart ? ` (model <strong style="color:#fafafa">${escape(vars.modelName ?? "")}</strong>)` : ""} came in ${vars.daysSinceInquiry} days ago and has not moved past the brief stage.</p>
<p style="margin:0 0 18px;color:#d4d4d8">Reply in the dashboard if you need more information or want to reset priority — an account manager will follow up within 24 hours.</p>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Open dashboard</a></p>`
  );

  return { subject, html, text };
}

export interface DigestEnVars {
  clientName?: string | null;
  active: Array<{
    id: string;
    title: string;
    /** English status label, e.g. "In production" */
    status_en: string;
    modelName: string | null;
    isRecent: boolean;
  }>;
  recentChangesCount: number;
  deliveredCount: number;
}

export function weeklyDigestEn(vars: DigestEnVars): RenderedEmail {
  const greet = vars.clientName ? `Hi ${vars.clientName},` : "Hello,";
  const url = `${BASE_URL}/client/dashboard`;
  const prefsUrl = `${BASE_URL}/client/preferences`;
  const subject = `[Virtual Agency] Weekly summary — ${vars.active.length} active project${vars.active.length === 1 ? "" : "s"}`;

  const lines =
    vars.active.length === 0
      ? ["You have no active projects this week."]
      : vars.active.map(
          (p) =>
            `${p.isRecent ? "› " : "  "}${p.title}${p.modelName ? ` (${p.modelName})` : ""} — ${p.status_en}`
        );

  const text =
    `${greet}\n\nThis week at a glance.\n\n` +
    `Active ${vars.active.length} · Changes this week ${vars.recentChangesCount} · Delivered to date ${vars.deliveredCount}\n\n` +
    `${lines.join("\n")}\n\n` +
    `Dashboard: ${url}\n` +
    `Unsubscribe: ${prefsUrl}\n`;

  const items = vars.active
    .map(
      (p) => `<li style="margin:6px 0;color:#d4d4d8">
        ${p.isRecent ? '<span style="color:#34d399">●</span> ' : '<span style="color:#3f3f46">○</span> '}
        <strong style="color:#fafafa">${escape(p.title)}</strong>
        ${p.modelName ? `<span style="color:#71717a"> · ${escape(p.modelName)}</span>` : ""}
        <span style="float:right;font-size:12px;color:#a1a1aa">${escape(p.status_en)}</span>
      </li>`
    )
    .join("");

  const html = wrap(
    subject,
    `<h2 style="margin:0 0 12px;font-size:20px;color:#fafafa">This week</h2>
<p style="margin:0 0 16px;color:#d4d4d8">${escape(greet)}</p>
<div style="display:flex;gap:8px;margin:0 0 18px">
  <div style="flex:1;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px"><p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Active</p><p style="margin:4px 0 0;color:#fafafa;font-weight:600">${vars.active.length}</p></div>
  <div style="flex:1;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px"><p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">This week</p><p style="margin:4px 0 0;color:#fafafa;font-weight:600">${vars.recentChangesCount}</p></div>
  <div style="flex:1;background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:12px"><p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Delivered</p><p style="margin:4px 0 0;color:#fafafa;font-weight:600">${vars.deliveredCount}</p></div>
</div>
${
  vars.active.length === 0
    ? '<p style="margin:0 0 18px;color:#a1a1aa">You have no active projects this week — start one whenever you are ready.</p>'
    : `<ul style="list-style:none;padding:0;margin:0 0 18px;border-top:1px solid #27272a">${items}</ul>`
}
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#fafafa;color:#0a0a0a;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Open dashboard</a></p>
<p style="margin:18px 0 0;font-size:11px;color:#71717a">To stop receiving weekly summaries, manage <a href="${prefsUrl}" style="color:#a1a1aa">notification preferences</a>.</p>`
  );

  return { subject, html, text };
}
