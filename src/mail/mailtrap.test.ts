import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  MailtrapClient,
  extractLinks,
  firstLinkMatching,
  loadMailtrapConfig,
} from './mailtrap.js';

describe('extractLinks', () => {
  it('pulls href and bare urls', () => {
    const html =
      '<a href="https://punimtagdev.levkin.ca/reset-password?token=abc">Reset</a> see https://example.com/x';
    const links = extractLinks(html);
    expect(links).toContain('https://punimtagdev.levkin.ca/reset-password?token=abc');
    expect(links).toContain('https://example.com/x');
    expect(firstLinkMatching(html, /reset-password/)).toContain('token=abc');
  });
});

describe('loadMailtrapConfig', () => {
  it('returns null when incomplete', () => {
    expect(loadMailtrapConfig({})).toBeNull();
    expect(loadMailtrapConfig({ MAILTRAP_API_TOKEN: 't' })).toBeNull();
  });

  it('loads from env aliases', () => {
    const cfg = loadMailtrapConfig({
      MAILTRAP_API_TOKEN: 'tok',
      MAILTRAP_INBOX_ID: '99',
      MAILTRAP_ACCOUNT_ID: '1',
    });
    expect(cfg).toEqual({
      apiToken: 'tok',
      inboxId: '99',
      accountId: '1',
      baseUrl: 'https://mailtrap.io',
    });
  });
});

describe('MailtrapClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists and waits for a matching message', async () => {
    const messages = [
      {
        id: 7,
        subject: 'Reset your password',
        to_email: 'e2e@example.com',
        created_at: new Date().toISOString(),
        html_path: '/api/accounts/1/inboxes/99/messages/7/body.html',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/messages') && !String(url).includes('body')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(messages),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            '<a href="https://punimtagdev.levkin.ca/reset-password?token=xyz">Reset</a>',
        };
      }),
    );

    const client = new MailtrapClient({
      apiToken: 'tok',
      accountId: '1',
      inboxId: '99',
    });
    const msg = await client.waitForEmail({
      to: 'e2e@example.com',
      subject: /reset/i,
      timeoutMs: 2_000,
      pollMs: 50,
    });
    expect(msg.id).toBe(7);
    const html = await client.getHtml(msg.id, msg.html_path);
    expect(firstLinkMatching(html, /reset-password/)).toContain('token=xyz');
  });
});
