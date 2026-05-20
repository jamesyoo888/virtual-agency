/**
 * Email provider abstraction. Decision (2026-05-20): Resend is the canonical
 * provider — single-key swap, good deliverability for Korean B2B addresses.
 *
 *  - `RESEND_API_KEY` alone is sufficient to activate the Resend path. No
 *    need to also set `EMAIL_PROVIDER=resend` — the key's presence is the
 *    signal.
 *  - When the key is missing (local dev, preview deploys without secrets),
 *    `LogProvider` logs the payload to the server console so business logic
 *    keeps working without a vendor connection.
 *  - Set `EMAIL_PROVIDER=log` to force-disable sends in an environment that
 *    *does* carry the key — useful for staging dry-runs.
 */

export type EmailAddress = string;

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  subject: string;
  html: string;
  text?: string;
  /** Defaults to `EMAIL_FROM` env var if omitted. */
  from?: EmailAddress;
  /** Optional reply-to (e.g. for inquiry replies). */
  replyTo?: EmailAddress;
  /** Free-form tags for provider-side analytics. */
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  ok: boolean;
  provider: string;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

class LogProvider implements EmailProvider {
  name = "log";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const recipients = Array.isArray(message.to) ? message.to.join(", ") : message.to;
    console.info(
      `[email:log] to=${recipients} subject=${JSON.stringify(message.subject)}`
    );
    return { ok: true, provider: this.name, skipped: true };
  }
}

class ResendProvider implements EmailProvider {
  name = "resend";
  constructor(private apiKey: string, private from: string) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from ?? this.from;
    const body = {
      from,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
      tags: message.tags
        ? Object.entries(message.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    };

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        // Resend usually responds <2s; cap at 10s so a hung provider
        // doesn't block status-change handlers or inquiry creation.
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          provider: this.name,
          error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        };
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { ok: true, provider: this.name, id: data.id };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

let cached: EmailProvider | null = null;

export function pickProvider(): EmailProvider {
  if (cached) return cached;

  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase();
  const from = process.env.EMAIL_FROM ?? "Virtual Agency <noreply@aihubs.uk>";

  // `EMAIL_PROVIDER=log` is the explicit dry-run escape hatch — honor it even
  // when an API key exists.
  if (explicit !== "log" && process.env.RESEND_API_KEY) {
    cached = new ResendProvider(process.env.RESEND_API_KEY, from);
    return cached;
  }

  cached = new LogProvider();
  return cached;
}

/** Test seam — drop the cached provider so env changes take effect. */
export function _resetEmailProviderForTests() {
  cached = null;
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = pickProvider();
  return provider.send(message);
}
