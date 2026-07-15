import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { createLogger, type Logger } from '../logging/logger.js';
import { saveStorageState } from './storageState.js';

export interface LaunchedSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface PersistentSessionOptions {
  /** Directory for control flag files (and, by default, storage state). */
  dir: string;
  /** (Re)launch the browser/context/page. Called on start and after any crash. */
  launch: () => Promise<LaunchedSession>;
  /** Runs once at start, and again every time RUN or READY is touched. */
  onRun: (session: LaunchedSession) => Promise<void>;
  /**
   * Called when `onRun` throws (after a browser-crash relaunch is already
   * handled internally). Return `true` to keep the session open and wait for
   * a manual RUN (e.g. after a human clears a captcha); return `false`, or
   * don't provide this, to rethrow and stop the loop.
   */
  onError?: (error: unknown, session: LaunchedSession) => Promise<boolean> | boolean;
  /** Path to persist storage state (cookies + localStorage) after each successful run. */
  storageStatePath?: string;
  /** Flag filenames, relative to `dir` (defaults: RUN / READY / CLOSE). */
  flags?: { run?: string; ready?: string; close?: string };
  /** Poll interval in ms while idle (default 2000). */
  pollMs?: number;
  logger?: Logger;
}

const CRASH_PATTERN = /context or browser has been closed|Target (page|closed)|Target page/i;

/** Exported for tests; true when `err` looks like the page/browser died mid-run. */
export function isBrowserCrashError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return CRASH_PATTERN.test(msg);
}

function clearFlag(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    /* already gone */
  }
}

/**
 * Keep ONE browser session open across many automation runs, controlled by
 * flag files instead of process restarts/relogins.
 *
 * Built for sites with bot-detection or occasional captchas, where closing
 * and reopening the browser on every run is slow and can itself trip
 * anti-automation heuristics. Instead:
 *
 *   - touch `<dir>/RUN`   — re-run `onRun` against the *same* page
 *   - touch `<dir>/READY` — same as RUN (semantic alias: "I cleared the captcha")
 *   - touch `<dir>/CLOSE` — save storage state (if configured) and shut down
 *
 * If the browser process dies unexpectedly (crash, manual close), it's
 * relaunched automatically via `launch()` and `onRun` is re-armed to fire on
 * the next iteration.
 */
export async function runPersistentSession(options: PersistentSessionOptions): Promise<void> {
  const log = options.logger ?? createLogger({ name: 'persistentSession' });
  mkdirSync(options.dir, { recursive: true });
  const runFlag = join(options.dir, options.flags?.run ?? 'RUN');
  const readyFlag = join(options.dir, options.flags?.ready ?? 'READY');
  const closeFlag = join(options.dir, options.flags?.close ?? 'CLOSE');
  const pollMs = options.pollMs ?? 2000;

  clearFlag(runFlag);
  clearFlag(readyFlag);
  clearFlag(closeFlag);

  let session = await options.launch();
  let doneOnce = false;

  while (!existsSync(closeFlag)) {
    let dead = false;
    try {
      void session.page.url();
    } catch {
      dead = true;
    }
    if (dead || !session.browser.isConnected()) {
      log.warn('browser closed unexpectedly — relaunching');
      session = await options.launch();
      doneOnce = false;
      continue;
    }

    const forced = existsSync(runFlag) || existsSync(readyFlag);
    if (forced) {
      clearFlag(runFlag);
      clearFlag(readyFlag);
    }

    if (!doneOnce || forced) {
      try {
        await options.onRun(session);
        doneOnce = true;
        if (options.storageStatePath) {
          await saveStorageState(session.context, options.storageStatePath);
        }
        log.info('run complete — session stays open (touch RUN to retry, CLOSE to quit)');
      } catch (err) {
        if (isBrowserCrashError(err)) {
          log.warn('browser closed mid-run — will relaunch');
          doneOnce = false;
          continue;
        }
        log.error('run failed', { error: err instanceof Error ? err.message : String(err) });
        const keepOpen = options.onError ? await options.onError(err, session) : false;
        doneOnce = true;
        if (!keepOpen) throw err;
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  log.info('CLOSE flag — shutting down');
  if (options.storageStatePath) {
    await saveStorageState(session.context, options.storageStatePath).catch(() => undefined);
  }
  await session.browser.close().catch(() => undefined);
}
