import { createLogger, type Logger } from '../logging/logger.js';

export interface WithDialogHandlers {
  /** True when the dialog/modal is currently open and usable. */
  isOpen: () => Promise<boolean>;
  /** Re-open the dialog (e.g. re-click the trigger, re-navigate). */
  reopen: () => Promise<void>;
}

export interface WithDialogOptions {
  /** How many times to reopen-and-retry after a failure (default 1 = two attempts total). */
  retries?: number;
  logger?: Logger;
}

/**
 * Run `fn` against a dialog/modal that a third-party SPA might silently close
 * out from under you (re-render, toast, navigation) between when you opened
 * it and when you finish interacting with it.
 *
 * Checks `isOpen()` before each attempt and calls `reopen()` if it's not —
 * this is the "modal lost — reopen" retry pattern, generalized instead of
 * hand-rolled per call site.
 */
export async function withDialog<T>(
  handlers: WithDialogHandlers,
  fn: () => Promise<T>,
  options?: WithDialogOptions,
): Promise<T> {
  const log = options?.logger ?? createLogger({ name: 'withDialog' });
  const retries = options?.retries ?? 1;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (!(await handlers.isOpen())) {
      log.warn('dialog not open — reopening', { attempt });
      await handlers.reopen();
    }
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log.warn('withDialog attempt failed', {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  throw lastErr;
}
