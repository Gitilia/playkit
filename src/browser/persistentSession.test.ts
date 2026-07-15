import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { isBrowserCrashError, runPersistentSession } from './persistentSession.js';

function mockSession() {
  const context = {
    storageState: vi.fn(async () => undefined),
  } as unknown as BrowserContext;
  const page = {
    url: vi.fn(() => 'https://example.com'),
  } as unknown as Page;
  const browser = {
    isConnected: vi.fn(() => true),
    close: vi.fn(async () => undefined),
  } as unknown as Browser;
  return { browser, context, page };
}

describe('isBrowserCrashError', () => {
  it('recognizes common Playwright crash messages', () => {
    expect(isBrowserCrashError(new Error('Target page, context or browser has been closed'))).toBe(
      true,
    );
    expect(isBrowserCrashError(new Error('Target closed'))).toBe(true);
    expect(isBrowserCrashError(new Error('something else'))).toBe(false);
  });
});

describe('runPersistentSession', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('runs onRun once at start, then exits once onRun touches CLOSE', async () => {
    dir = mkdtempSync(join(tmpdir(), 'playkit-session-'));
    const session = mockSession();
    const launch = vi.fn(async () => session);
    const onRun = vi.fn(async () => {
      writeFileSync(join(dir, 'CLOSE'), '');
    });

    await runPersistentSession({ dir, launch, onRun, pollMs: 5 });

    expect(launch).toHaveBeenCalledOnce();
    expect(onRun).toHaveBeenCalledOnce();
    expect(session.browser.close).toHaveBeenCalledOnce();
  });

  it('re-runs onRun when RUN is touched, saving storage state on each success', async () => {
    dir = mkdtempSync(join(tmpdir(), 'playkit-session-'));
    const storageStatePath = join(dir, 'state.json');
    const session = mockSession();
    const launch = vi.fn(async () => session);
    let calls = 0;
    const onRun = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        setTimeout(() => writeFileSync(join(dir, 'RUN'), ''), 20);
      } else {
        writeFileSync(join(dir, 'CLOSE'), '');
      }
    });

    await runPersistentSession({ dir, launch, onRun, storageStatePath, pollMs: 5 });

    expect(onRun).toHaveBeenCalledTimes(2);
    // Once after each successful run, plus once more on the final CLOSE shutdown.
    expect(session.context.storageState).toHaveBeenCalledTimes(3);
  });

  it('relaunches automatically when the page/browser looks dead', async () => {
    dir = mkdtempSync(join(tmpdir(), 'playkit-session-'));
    const freshSession = mockSession();
    const deadPage = {
      url: vi.fn(() => {
        throw new Error('closed');
      }),
    } as unknown as Page;
    const deadBrowser = {
      isConnected: vi.fn(() => false),
      close: vi.fn(async () => undefined),
    } as unknown as Browser;

    let launchCount = 0;
    const launch = vi.fn(async () => {
      launchCount += 1;
      if (launchCount === 1) {
        return { browser: deadBrowser, context: freshSession.context, page: deadPage };
      }
      return freshSession;
    });
    const onRun = vi.fn(async () => {
      writeFileSync(join(dir, 'CLOSE'), '');
    });

    await runPersistentSession({ dir, launch, onRun, pollMs: 5 });

    expect(launch).toHaveBeenCalledTimes(2);
    expect(onRun).toHaveBeenCalledOnce();
  });

  it('keeps the session open when onError returns true, and stops once CLOSE appears', async () => {
    dir = mkdtempSync(join(tmpdir(), 'playkit-session-'));
    const session = mockSession();
    const launch = vi.fn(async () => session);
    let calls = 0;
    const onRun = vi.fn(async () => {
      calls += 1;
      throw new Error('boom');
    });
    const onError = vi.fn(async () => {
      writeFileSync(join(dir, 'CLOSE'), '');
      return true;
    });

    await runPersistentSession({ dir, launch, onRun, onError, pollMs: 5 });

    expect(calls).toBe(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('rethrows when onError is not provided', async () => {
    dir = mkdtempSync(join(tmpdir(), 'playkit-session-'));
    const session = mockSession();
    const launch = vi.fn(async () => session);
    const onRun = vi.fn(async () => {
      throw new Error('fatal');
    });

    await expect(runPersistentSession({ dir, launch, onRun, pollMs: 5 })).rejects.toThrow('fatal');
  });
});
