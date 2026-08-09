import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * Save Playwright storage state (cookies + localStorage) for reuse across suites.
 * Typical use: one-time admin login → save → other specs load via `test.use({ storageState })`.
 */
export async function saveStorageState(
  source: Page | BrowserContext,
  filePath: string,
): Promise<string> {
  mkdirSync(dirname(filePath), { recursive: true });
  const context = 'context' in source ? source.context() : source;
  await context.storageState({ path: filePath });
  return filePath;
}

/** Options blob for `test.use({ storageState: path })` / project config. */
export function storageStateUse(filePath: string): { storageState: string } {
  return { storageState: filePath };
}

export type StorageStateLike = {
  cookies: Array<{ name: string; value: string }>;
};

/**
 * Pull a named cookie from a Playwright storage-state object or JSON file path
 * and return an `Authorization` header value (`Bearer <token>`).
 *
 * Useful when a headed login left cookies on disk and a follow-up script needs
 * the same session against a JSON API (e.g. Outline `accessToken`).
 */
export function cookiesToBearer(state: StorageStateLike | string, cookieName: string): string {
  const parsed: StorageStateLike =
    typeof state === 'string'
      ? (JSON.parse(readFileSync(state, 'utf8')) as StorageStateLike)
      : state;
  const cookies = parsed?.cookies;
  if (!Array.isArray(cookies)) {
    throw new Error('cookiesToBearer: storage state has no cookies array');
  }
  const hit = cookies.find((c) => c.name === cookieName);
  if (!hit?.value) {
    throw new Error(`cookiesToBearer: cookie "${cookieName}" not found`);
  }
  return `Bearer ${hit.value}`;
}
