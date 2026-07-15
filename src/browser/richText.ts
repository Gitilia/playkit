import type { Locator } from '@playwright/test';
import { createLogger, type Logger } from '../logging/logger.js';

export interface FillContentEditableOptions {
  /**
   * How to render a paragraph break between `value`'s blank-line-separated
   * paragraphs: 'double-enter' (default) types Enter twice, which is what most
   * rich-text widgets (incl. LinkedIn's) need to render an actual blank line
   * instead of collapsing consecutive lines into inline text; 'enter' types it
   * once for widgets that already treat a single Enter as a new block.
   */
  paragraphBreak?: 'double-enter' | 'enter';
  /** Per-keystroke delay in ms passed to `page.keyboard.type` (default 4). */
  typeDelay?: number;
  timeout?: number;
  logger?: Logger;
}

/**
 * Type `value` into a `contenteditable` rich-text field via real keyboard
 * events, splitting on blank lines (`\n\n`) so multi-paragraph/bulleted text
 * renders as separate blocks instead of collapsing into one run.
 *
 * `Locator.fill()` only works on `<input>`/`<textarea>` — it's a no-op or
 * throws on `contenteditable` divs, which is what many CMS/social-profile
 * rich-text fields actually use (LinkedIn's About and Description fields,
 * for example, look like a `<textarea>` visually but aren't one).
 */
export async function fillContentEditable(
  locator: Locator,
  value: string,
  options?: FillContentEditableOptions,
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'fillContentEditable' });
  await locator.waitFor({ state: 'visible', timeout: options?.timeout ?? 20_000 });
  const page = locator.page();
  await locator.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press('Backspace');

  const paragraphs = value
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const delay = options?.typeDelay ?? 4;

  for (let i = 0; i < paragraphs.length; i++) {
    await page.keyboard.type(paragraphs[i]!, { delay });
    if (i < paragraphs.length - 1) {
      await page.keyboard.press('Enter');
      if (options?.paragraphBreak !== 'enter') {
        await page.keyboard.press('Enter');
      }
    }
  }
  log.debug('fillContentEditable done', { paragraphs: paragraphs.length });
}
