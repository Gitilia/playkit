import { describe, expect, it } from 'vitest';
import { redactSecrets } from './redact.js';

describe('redactSecrets', () => {
  it('redacts common secret keys while leaving other fields intact', () => {
    const input = {
      user: 'ilia',
      password: 'hunter2',
      apiKey: 'abc123',
      api_key: 'abc123',
      authorization: 'token xyz',
      cookie: 'session=deadbeef',
      count: 3,
    };
    expect(redactSecrets(input)).toEqual({
      user: 'ilia',
      password: '[REDACTED]',
      apiKey: '[REDACTED]',
      api_key: '[REDACTED]',
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      count: 3,
    });
  });

  it('redacts nested objects and arrays', () => {
    const input = {
      requests: [
        { url: '/login', headers: { Authorization: 'Bearer abc.def' } },
        { url: '/users', headers: { Accept: 'application/json' } },
      ],
      config: { db: { passWord: 'pg-secret' } },
    };
    const out = redactSecrets(input);
    expect(out.requests[0].headers.Authorization).toBe('[REDACTED]');
    expect(out.requests[1].headers.Accept).toBe('application/json');
    expect(out.config.db.passWord).toBe('[REDACTED]');
    expect(out.requests[0].url).toBe('/login');
  });

  it('redacts Bearer tokens embedded in free-text strings', () => {
    expect(redactSecrets('request sent with Bearer fake.token-value_1 attached')).toBe(
      'request sent with Bearer [REDACTED] attached',
    );
  });

  it('leaves empty-string secret values alone (nothing to leak)', () => {
    expect(redactSecrets({ token: '' })).toEqual({ token: '' });
  });

  it('passes through null, undefined, and primitives', () => {
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets(undefined)).toBeUndefined();
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets('no secrets here')).toBe('no secrets here');
  });
});
