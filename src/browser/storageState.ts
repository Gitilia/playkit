import { mkdirSync } from 'node:fs';
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
