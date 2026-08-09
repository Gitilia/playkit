import type { Locator, Page } from '@playwright/test';
import { createLogger, type Logger } from '../logging/logger.js';
import { click as clickHelper, type ClickOptions } from './actions.js';

export interface ByAriaLabelOptions {
  /** Element tags to scan (default: interactive-ish: button, a, [role=button]/[role=link]). */
  selector?: string;
  /**
   * Prefer a visible match when several elements share a matching aria-label
   * (common with Radix/headless UI twins that leave a hidden copy in the DOM).
   * When true and no match is visible, falls back to the first regex match.
   */
  preferVisible?: boolean;
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
 *
 * Pass `preferVisible: true` to skip hidden matches first (then fall back to
 * the first match if none are visible).
 */
export async function byAriaLabel(
  root: Page | Locator,
  pattern: RegExp,
  options?: ByAriaLabelOptions,
): Promise<Locator | null> {
  const log = options?.logger ?? createLogger({ name: 'byAriaLabel' });
  const selector = options?.selector ?? DEFAULT_SELECTOR;
  const preferVisible = options?.preferVisible === true;
  const candidates = root.locator(selector);
  const count = await candidates.count();

  let firstMatch: Locator | null = null;
  let firstLabel: string | null = null;

  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    const label = await el.getAttribute('aria-label');
    if (!(label && pattern.test(label))) continue;

    if (!firstMatch) {
      firstMatch = el;
      firstLabel = label;
      if (!preferVisible) {
        log.debug('byAriaLabel matched', { pattern: pattern.source, label });
        return el;
      }
    }

    if (preferVisible) {
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        log.debug('byAriaLabel matched visible', { pattern: pattern.source, label });
        return el;
      }
    }
  }

  if (preferVisible && firstMatch) {
    log.debug('byAriaLabel visible none; falling back to first match', {
      pattern: pattern.source,
      label: firstLabel,
    });
    return firstMatch;
  }

  log.debug('byAriaLabel no match', { pattern: pattern.source, scanned: count });
  return null;
}

/**
 * `byAriaLabel` + click in one call. Throws with the pattern in the message
 * (instead of a generic "locator not found") when nothing matches, since that's
 * the single most useful piece of context when debugging a failed run later.
 *
 * Defaults `preferVisible: true` so hidden Radix/menu twins are skipped when a
 * visible match exists. Pass `preferVisible: false` to restore first-match.
 */
export async function clickByAriaLabel(
  root: Page | Locator,
  pattern: RegExp,
  options?: ByAriaLabelOptions & ClickOptions,
): Promise<string> {
  const found = await byAriaLabel(root, pattern, {
    ...options,
    preferVisible: options?.preferVisible ?? true,
  });
  if (!found) {
    throw new Error(`clickByAriaLabel: no element with aria-label matching ${pattern} found`);
  }
  const label = (await found.getAttribute('aria-label')) ?? '';
  await clickHelper(found, options);
  return label;
}
