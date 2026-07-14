import { describe, expect, it, vi, afterEach } from 'vitest';
import { MailpitClient, loadMailpitConfig } from './mailpit.js';

describe('loadMailpitConfig', () => {
  it('returns null without base url', () => {
    expect(loadMailpitConfig({})).toBeNull();
  });

  it('loads base url and auth', () => {
    expect(
      loadMailpitConfig({
        MAILPIT_BASE_URL: 'http://10.0.10.45:8025',
        MAILPIT_USER: 'u',
        MAILPIT_PASSWORD: 'p',
      }),
    ).toEqual({
      baseUrl: 'http://10.0.10.45:8025',
      user: 'u',
      password: 'p',
    });
  });
});

describe('MailpitClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('waits for matching message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes('/api/v1/messages') && !u.includes('/message/')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                messages: [
                  {
                    ID: 'abc',
                    Subject: 'Reset your password',
                    To: [{ Address: 'e2e@example.com' }],
                    Date: new Date().toISOString(),
                  },
                ],
              }),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              ID: 'abc',
              Subject: 'Reset your password',
              To: [{ Address: 'e2e@example.com' }],
              HTML: '<a href="https://punimtagdev.levkin.ca/reset-password?token=x">Reset</a>',
            }),
        };
      }),
    );

    const client = new MailpitClient({ baseUrl: 'http://mailpit.test' });
    const msg = await client.waitForEmail({
      to: 'e2e@example.com',
      subject: /reset/i,
      timeoutMs: 1000,
      pollMs: 50,
    });
    expect(msg.ID).toBe('abc');
    expect(msg.HTML).toContain('reset-password');
  });
});
