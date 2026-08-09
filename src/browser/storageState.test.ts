import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cookiesToBearer, storageStateUse } from './storageState.js';

describe('storageStateUse', () => {
  it('returns a Playwright use() blob', () => {
    expect(storageStateUse('/tmp/state.json')).toEqual({ storageState: '/tmp/state.json' });
  });
});

describe('cookiesToBearer', () => {
  it('formats Bearer from an in-memory storage state', () => {
    const auth = cookiesToBearer(
      {
        cookies: [
          { name: 'csrfToken', value: 'x' },
          { name: 'accessToken', value: 'tok-123' },
        ],
      },
      'accessToken',
    );
    expect(auth).toBe('Bearer tok-123');
  });

  it('reads storage state from a JSON file path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'playkit-state-'));
    const path = join(dir, 'state.json');
    writeFileSync(
      path,
      JSON.stringify({ cookies: [{ name: 'accessToken', value: 'from-file' }] }),
    );
    expect(cookiesToBearer(path, 'accessToken')).toBe('Bearer from-file');
  });

  it('throws when the cookie is missing', () => {
    expect(() => cookiesToBearer({ cookies: [] }, 'accessToken')).toThrow(
      /cookie "accessToken" not found/,
    );
  });

  it('throws when cookies array is missing', () => {
    expect(() => cookiesToBearer({} as { cookies: [] }, 'accessToken')).toThrow(
      /no cookies array/,
    );
  });
});
