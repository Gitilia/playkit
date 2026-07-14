import { createLogger, type Logger } from '../logging/logger.js';
import { extractLinks, firstLinkMatching } from './mailtrap.js';

export interface MailpitConfig {
  baseUrl: string;
  /** Basic auth user (optional). */
  user?: string;
  /** Basic auth password (optional). */
  password?: string;
  logger?: Logger;
}

export interface MailpitMessageSummary {
  ID: string;
  MessageID?: string;
  From?: { Name?: string; Address?: string };
  To?: Array<{ Name?: string; Address?: string }>;
  Subject?: string;
  Date?: string;
  Created?: string;
  Snippet?: string;
}

export interface MailpitMessage extends MailpitMessageSummary {
  HTML?: string;
  Text?: string;
}

export interface WaitForMailpitOptions {
  to?: string;
  subject?: string | RegExp;
  after?: Date;
  timeoutMs?: number;
  pollMs?: number;
  search?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function matchesSubject(subject: string, want?: string | RegExp): boolean {
  if (want == null) return true;
  if (typeof want === 'string') return subject.toLowerCase().includes(want.toLowerCase());
  return want.test(subject);
}

/**
 * Load Mailpit config from env. Returns null if MAILPIT_BASE_URL unset.
 *
 * Env:
 * - PLAYKIT_MAILPIT_BASE_URL / MAILPIT_BASE_URL (e.g. http://10.0.10.45:8025)
 * - MAILPIT_USER / MAILPIT_PASSWORD (basic auth)
 */
export function loadMailpitConfig(env: NodeJS.ProcessEnv = process.env): MailpitConfig | null {
  const baseUrl = (
    env.PLAYKIT_MAILPIT_BASE_URL ||
    env.MAILPIT_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  if (!baseUrl) return null;
  return {
    baseUrl,
    user: env.PLAYKIT_MAILPIT_USER || env.MAILPIT_USER || undefined,
    password: env.PLAYKIT_MAILPIT_PASSWORD || env.MAILPIT_PASSWORD || undefined,
  };
}

/**
 * Homelab Mailpit client (LAN mail trap). Prefer this over SaaS Mailtrap when
 * the inbox is self-hosted at automationlab.
 */
export class MailpitClient {
  private readonly log: Logger;
  private readonly baseUrl: string;
  private readonly authHeader?: string;

  constructor(config: MailpitConfig) {
    this.log = config.logger ?? createLogger({ name: 'MailpitClient' });
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.user && config.password) {
      this.authHeader =
        'Basic ' + Buffer.from(`${config.user}:${config.password}`).toString('base64');
    }
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env, logger?: Logger): MailpitClient | null {
    const cfg = loadMailpitConfig(env);
    if (!cfg) return null;
    return new MailpitClient({ ...cfg, logger });
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (this.authHeader) h.Authorization = this.authHeader;
    return h;
  }

  async listMessages(opts?: { search?: string }): Promise<MailpitMessageSummary[]> {
    const url = new URL(`${this.baseUrl}/api/v1/messages`);
    if (opts?.search) url.searchParams.set('query', opts.search);
    url.searchParams.set('limit', '50');
    const res = await fetch(url, { headers: this.headers() });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mailpit list failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = JSON.parse(text) as { messages?: MailpitMessageSummary[] };
    return data.messages ?? [];
  }

  async getMessage(id: string): Promise<MailpitMessage> {
    const res = await fetch(`${this.baseUrl}/api/v1/message/${id}`, {
      headers: this.headers(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mailpit get message failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as MailpitMessage;
  }

  async getHtml(id: string): Promise<string> {
    const msg = await this.getMessage(id);
    return msg.HTML || msg.Text || '';
  }

  async deleteAll(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }

  async waitForEmail(opts: WaitForMailpitOptions = {}): Promise<MailpitMessage> {
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const pollMs = opts.pollMs ?? 2_000;
    const started = Date.now();
    const search = opts.search || opts.to || undefined;

    while (Date.now() - started < timeoutMs) {
      const list = await this.listMessages({ search });
      for (const summary of list) {
        const toAddrs = (summary.To || []).map((t) => (t.Address || '').toLowerCase());
        if (opts.to && !toAddrs.some((a) => a.includes(opts.to!.toLowerCase()))) {
          continue;
        }
        if (!matchesSubject(summary.Subject || '', opts.subject)) continue;
        if (opts.after) {
          const raw = summary.Date || summary.Created;
          if (raw) {
            const t = new Date(raw);
            if (!Number.isNaN(t.getTime()) && t < opts.after) continue;
          }
        }
        const full = await this.getMessage(summary.ID);
        this.log.info('mailpit.match', {
          id: full.ID,
          subject: full.Subject,
          to: toAddrs.join(','),
        });
        return full;
      }
      await sleep(pollMs);
    }

    throw new Error(
      `Mailpit: no matching email within ${timeoutMs}ms` +
        (opts.to ? ` (to~=${opts.to})` : '') +
        (opts.subject ? ` (subject~=${String(opts.subject)})` : ''),
    );
  }
}

export { extractLinks, firstLinkMatching };
