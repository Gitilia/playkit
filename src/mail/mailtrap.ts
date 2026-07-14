import { createLogger, type Logger } from '../logging/logger.js';

export interface MailtrapConfig {
  apiToken: string;
  /** Classic Email Testing account id (Settings → API). */
  accountId?: string;
  /** Inbox / sandbox id (Sandboxes UI). */
  inboxId: string;
  baseUrl?: string;
  logger?: Logger;
}

export interface MailtrapMessage {
  id: number;
  subject: string;
  from_email?: string;
  to_email?: string;
  created_at?: string;
  sent_at?: string;
  html_path?: string;
  txt_path?: string;
  raw_path?: string;
  [key: string]: unknown;
}

export interface WaitForEmailOptions {
  /** Match recipient (substring, case-insensitive). */
  to?: string;
  /** Match subject (string substring or RegExp). */
  subject?: string | RegExp;
  /** Only messages at/after this time (client-side filter). */
  after?: Date;
  /** Search query passed to Mailtrap (`subject`, `to_email`, `to_name`). */
  search?: string;
  timeoutMs?: number;
  pollMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function matchesSubject(subject: string, want?: string | RegExp): boolean {
  if (want == null) return true;
  if (typeof want === 'string') return subject.toLowerCase().includes(want.toLowerCase());
  return want.test(subject);
}

function messageTime(msg: MailtrapMessage): Date | null {
  const raw = msg.sent_at || msg.created_at;
  if (!raw || typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Extract http(s) links from HTML or plain text.
 */
export function extractLinks(htmlOrText: string): string[] {
  const hrefs = [...htmlOrText.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const bare = [...htmlOrText.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map((m) =>
    m[0].replace(/[.,;]+$/, ''),
  );
  return [...new Set([...hrefs, ...bare])];
}

export function firstLinkMatching(
  htmlOrText: string,
  pattern: string | RegExp,
): string | undefined {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  return extractLinks(htmlOrText).find((u) => re.test(u));
}

/**
 * Load Mailtrap config from env. Returns null if not configured
 * (so consumers can `test.skip` cleanly).
 *
 * Env (any alias works):
 * - PLAYKIT_MAILTRAP_API_TOKEN / MAILTRAP_API_TOKEN
 * - PLAYKIT_MAILTRAP_INBOX_ID / MAILTRAP_INBOX_ID / MAILTRAP_SANDBOX_ID
 * - PLAYKIT_MAILTRAP_ACCOUNT_ID / MAILTRAP_ACCOUNT_ID (optional for /api/sandboxes path)
 */
export function loadMailtrapConfig(
  env: NodeJS.ProcessEnv = process.env,
): MailtrapConfig | null {
  const apiToken =
    env.PLAYKIT_MAILTRAP_API_TOKEN || env.MAILTRAP_API_TOKEN || env.MAILTRAP_API_KEY || '';
  const inboxId =
    env.PLAYKIT_MAILTRAP_INBOX_ID ||
    env.MAILTRAP_INBOX_ID ||
    env.MAILTRAP_SANDBOX_ID ||
    '';
  const accountId =
    env.PLAYKIT_MAILTRAP_ACCOUNT_ID || env.MAILTRAP_ACCOUNT_ID || undefined;

  if (!apiToken || !inboxId) return null;
  return {
    apiToken,
    inboxId,
    accountId: accountId || undefined,
    baseUrl: (env.PLAYKIT_MAILTRAP_BASE_URL || env.MAILTRAP_BASE_URL || 'https://mailtrap.io').replace(
      /\/$/,
      '',
    ),
  };
}

/**
 * Mailtrap Email Testing (Sandbox) client.
 *
 * Emails only appear here if the app SMTP points at the sandbox
 * (`sandbox.smtp.mailtrap.io` + inbox user/pass) — not if you send via Gmail
 * to a real address.
 */
export class MailtrapClient {
  private readonly log: Logger;
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly inboxId: string;
  private readonly accountId?: string;

  constructor(config: MailtrapConfig) {
    this.log = config.logger ?? createLogger({ name: 'MailtrapClient' });
    this.baseUrl = (config.baseUrl || 'https://mailtrap.io').replace(/\/$/, '');
    this.token = config.apiToken;
    this.inboxId = config.inboxId;
    this.accountId = config.accountId;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env, logger?: Logger): MailtrapClient | null {
    const cfg = loadMailtrapConfig(env);
    if (!cfg) return null;
    return new MailtrapClient({ ...cfg, logger });
  }

  private headers(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Api-Token': this.token,
      Authorization: `Bearer ${this.token}`,
    };
  }

  private messagesCollectionUrl(): string {
    if (this.accountId) {
      return `${this.baseUrl}/api/accounts/${this.accountId}/inboxes/${this.inboxId}/messages`;
    }
    return `${this.baseUrl}/api/sandboxes/${this.inboxId}/messages`;
  }

  private messageUrl(messageId: number, suffix = ''): string {
    if (this.accountId) {
      return `${this.baseUrl}/api/accounts/${this.accountId}/inboxes/${this.inboxId}/messages/${messageId}${suffix}`;
    }
    return `${this.baseUrl}/api/sandboxes/${this.inboxId}/messages/${messageId}${suffix}`;
  }

  async listMessages(opts?: { search?: string }): Promise<MailtrapMessage[]> {
    const url = new URL(this.messagesCollectionUrl());
    if (opts?.search) url.searchParams.set('search', opts.search);

    this.log.info('mailtrap.list', { url: url.toString().replace(this.token, '[REDACTED]') });
    const res = await fetch(url, { headers: this.headers() });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mailtrap list messages failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = text ? (JSON.parse(text) as MailtrapMessage[]) : [];
    return Array.isArray(data) ? data : [];
  }

  async getHtml(messageId: number, htmlPath?: string): Promise<string> {
    const path = htmlPath?.startsWith('http')
      ? htmlPath
      : htmlPath
        ? `${this.baseUrl}${htmlPath.startsWith('/') ? '' : '/'}${htmlPath}`
        : this.messageUrl(messageId, '/body.html');
    const res = await fetch(path, { headers: this.headers() });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mailtrap get HTML failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return text;
  }

  async getText(messageId: number, txtPath?: string): Promise<string> {
    const path = txtPath?.startsWith('http')
      ? txtPath
      : txtPath
        ? `${this.baseUrl}${txtPath.startsWith('/') ? '' : '/'}${txtPath}`
        : this.messageUrl(messageId, '/body.txt');
    const res = await fetch(path, { headers: this.headers() });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mailtrap get text failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return text;
  }

  async deleteMessage(messageId: number): Promise<void> {
    const res = await fetch(this.messageUrl(messageId), {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Mailtrap delete failed (${res.status}): ${text.slice(0, 300)}`);
    }
  }

  /**
   * Poll until a matching message appears.
   */
  async waitForEmail(opts: WaitForEmailOptions = {}): Promise<MailtrapMessage> {
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const pollMs = opts.pollMs ?? 2_000;
    const started = Date.now();
    const search = opts.search || opts.to || undefined;

    while (Date.now() - started < timeoutMs) {
      const messages = await this.listMessages({ search });
      const match = messages.find((m) => {
        if (opts.to && !(m.to_email || '').toLowerCase().includes(opts.to.toLowerCase())) {
          return false;
        }
        if (!matchesSubject(m.subject || '', opts.subject)) return false;
        if (opts.after) {
          const t = messageTime(m);
          if (t && t < opts.after) return false;
        }
        return true;
      });
      if (match) {
        this.log.info('mailtrap.match', {
          id: match.id,
          subject: match.subject,
          to: match.to_email,
        });
        return match;
      }
      await sleep(pollMs);
    }

    throw new Error(
      `Mailtrap: no matching email within ${timeoutMs}ms` +
        (opts.to ? ` (to~=${opts.to})` : '') +
        (opts.subject ? ` (subject~=${opts.subject})` : ''),
    );
  }
}
