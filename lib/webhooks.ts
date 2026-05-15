/**
 * Operator-facing webhooks for new-inquiry notifications. Independent of the
 * email decision (Resend/SES/Postmark) — Slack and Discord webhooks are
 * free, no signup, and the URL is a single env var.
 *
 * Configure either:
 *   SLACK_WEBHOOK_URL   — https://hooks.slack.com/services/...
 *   DISCORD_WEBHOOK_URL — https://discord.com/api/webhooks/...
 *
 * Both can be set simultaneously; the fan-out is best-effort and never
 * throws back into the inquiry-creation path.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://virtual-agency-murex.vercel.app";

export interface InquiryNotificationPayload {
  projectId: string;
  projectTitle: string;
  modelName: string | null;
  clientCompany: string | null;
  clientEmail: string | null;
  briefExcerpt: string | null;
  budgetRange?: string | null;
}

function inboxUrl(projectId: string): string {
  return `${SITE_URL}/admin/inbox#project-${projectId}`;
}

function buildSlackBody(p: InquiryNotificationPayload) {
  const lines = [
    `*🆕 새 의뢰 도착*`,
    `*${p.projectTitle}*` + (p.modelName ? `  ·  ${p.modelName}` : ""),
    p.clientCompany || p.clientEmail
      ? `${p.clientCompany ?? ""}${p.clientCompany && p.clientEmail ? " / " : ""}${p.clientEmail ?? ""}`
      : null,
    p.budgetRange ? `예산: ${p.budgetRange}` : null,
    p.briefExcerpt ? `> ${p.briefExcerpt.replace(/\n/g, " ").slice(0, 200)}` : null,
    `<${inboxUrl(p.projectId)}|Inbox 열기>`,
  ].filter(Boolean);

  return { text: lines.join("\n") };
}

function buildDiscordBody(p: InquiryNotificationPayload) {
  const fields = [
    p.modelName ? { name: "모델", value: p.modelName, inline: true } : null,
    p.clientCompany ? { name: "회사", value: p.clientCompany, inline: true } : null,
    p.clientEmail ? { name: "이메일", value: p.clientEmail, inline: true } : null,
    p.budgetRange ? { name: "예산", value: p.budgetRange, inline: true } : null,
    p.briefExcerpt
      ? { name: "요약", value: p.briefExcerpt.slice(0, 1000) }
      : null,
  ].filter(Boolean) as { name: string; value: string; inline?: boolean }[];

  return {
    embeds: [
      {
        title: `🆕 ${p.projectTitle}`,
        url: inboxUrl(p.projectId),
        color: 0xfafafa,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function fire(url: string, body: unknown, label: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[webhook:${label}] failed ${res.status}`);
    }
  } catch (err) {
    console.warn(`[webhook:${label}] threw`, err);
  }
}

/**
 * Send the inquiry notification to whichever webhook destinations are
 * configured. Always returns — never lets a webhook failure surface to the
 * caller (the inquiry has already been written; an alert miss is recoverable
 * by checking Inbox manually).
 */
export async function notifyInquiryWebhook(
  payload: InquiryNotificationPayload
): Promise<{ sent: number }> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;

  const tasks: Promise<void>[] = [];
  if (slackUrl) tasks.push(fire(slackUrl, buildSlackBody(payload), "slack"));
  if (discordUrl) tasks.push(fire(discordUrl, buildDiscordBody(payload), "discord"));

  await Promise.allSettled(tasks);
  return { sent: tasks.length };
}

// Exposed for unit tests.
export const _internal = { buildSlackBody, buildDiscordBody, inboxUrl };
