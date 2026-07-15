import { describe, expect, it } from 'vitest';
import {
  dedupeNetworkErrors,
  matchesExcludePattern,
  type NetworkError,
} from './network.js';

describe('matchesExcludePattern', () => {
  it('matches substring and regex', () => {
    expect(matchesExcludePattern('https://cdn.example.com/x.js', ['cdn.example.com'])).toBe(
      true,
    );
    expect(matchesExcludePattern('https://api.example.com/users', [/\/users$/])).toBe(true);
    expect(matchesExcludePattern('https://api.example.com/ok', ['cdn', /\/missing/])).toBe(
      false,
    );
  });
});

describe('dedupeNetworkErrors', () => {
  it('keeps first of identical method/status/url', () => {
    const raw: NetworkError[] = [
      {
        url: 'https://api/x',
        status: 500,
        method: 'GET',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      {
        url: 'https://api/x',
        status: 500,
        method: 'GET',
        timestamp: '2026-01-01T00:00:01.000Z',
      },
      {
        url: 'https://api/x',
        status: 404,
        method: 'GET',
        timestamp: '2026-01-01T00:00:02.000Z',
      },
    ];
    const out = dedupeNetworkErrors(raw);
    expect(out).toHaveLength(2);
    expect(out[0]?.status).toBe(500);
    expect(out[1]?.status).toBe(404);
  });
});
