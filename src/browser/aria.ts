import type { Locator, Page } from '@playwright/test';
import { createLogger, type Logger } from '../logging/logger.js';
import { click as clickHelper, type ClickOptions } from './actions.js';

export interface ByAriaLabelOptions {
  /** Element tags to scan (default: interactive-ish: button, a, [role=button]/[role=link]). */
  selector?: string;
  logger?: Logger;
}

const DEFAULT_SELECTOR =
  'button[aria-label], a[aria-label], [role="button"][aria-label], [role="link"][aria-label]';

/**
 * Find the first element whose `aria-label` matches `pattern`, scoped to `root`
 * (a Page or a Locator, e.g. a specific dialog) so unrelated matches elsewhere
 * on the page don't win.
 *
 * Built for third-party UIs where you don't control markup and can't rely on
 * stable test ids — aria-labels there are often compound and dynamic (e.g.
 * "Edit Staff Automation Engineer at NiyaSoft"), so exact-string locators
 * extracted from a single DOM dump tend to be brittle; a regex survives
 * per-record text variation.
 *
 * Returns `null` (rather than throwing) when nothing matches, so callers can
 * fall back to an alternate strategy (e.g. a nearby icon button) before
 * giving up — see `withDialog` for retrying the whole lookup after a reopen.
 */
export async function byAriaLabel(
  root: Page | Locator,
  pattern: RegExp,
  options?: ByAriaLabelOptions,
): Promise<Locator | null> {
  const log = options?.logger ?? createLogger({ name: 'byAriaLabel' });
  const selector = options?.selector ?? DEFAULT_SELECTOR;
  const candidates = root.locator(selector);
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    const label = await el.getAttribute('aria-label');
    if (label && pattern.test(label)) {
      log.debug('byAriaLabel matched', { pattern: pattern.source, label });
      return el;
    }
  }
  log.debug('byAriaLabel no match', { pattern: pattern.source, scanned: count });
  return null;
}

/**
 * `byAriaLabel` + click in one call. Throws with the pattern in the message
 * (instead of a generic "locator not found") when nothing matches, since that's
 * the single most useful piece of context when debugging a failed run later.
 */
export async function clickByAriaLabel(
  root: Page | Locator,
  pattern: RegExp,
  options?: ByAriaLabelOptions & ClickOptions,
): Promise<string> {
  const found = await byAriaLabel(root, pattern, options);
  if (!found) {
    throw new Error(`clickByAriaLabel: no element with aria-label matching ${pattern} found`);
  }
  const label = (await found.getAttribute('aria-label')) ?? '';
  await clickHelper(found, options);
  return label;
}
