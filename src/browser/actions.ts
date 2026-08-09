import type { Locator, Page } from '@playwright/test';
import { createLogger, type Logger } from '../logging/logger.js';
import { isPrivateHost } from '../config/loadConfig.js';

export interface ClickOptions {
  timeout?: number;
  retries?: number;
  force?: boolean;
  trial?: boolean;
}

export interface FillOptions {
  timeout?: number;
  retries?: number;
  clear?: boolean;
}

export interface GotoOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  retries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetries<T>(
  label: string,
  retries: number,
  log: Logger,
  fn: () => Promise<T>,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const started = Date.now();
      const result = await fn();
      log.debug(label, { attempt, ms: Date.now() - started });
      return result;
    } catch (err) {
      last = err;
      log.warn(`${label} failed`, {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < retries) await sleep(250 * (attempt + 1));
    }
  }
  throw last;
}

export async function waitForVisible(
  locator: Locator,
  options?: { timeout?: number; logger?: Logger },
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'waitForVisible' });
  log.debug('waitForVisible');
  await locator.waitFor({ state: 'visible', timeout: options?.timeout ?? 30_000 });
}

export async function waitForHidden(
  locator: Locator,
  options?: { timeout?: number; logger?: Logger },
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'waitForHidden' });
  log.debug('waitForHidden');
  await locator.waitFor({ state: 'hidden', timeout: options?.timeout ?? 30_000 });
}

export async function click(
  locator: Locator,
  options?: ClickOptions & { logger?: Logger },
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'click' });
  const retries = options?.retries ?? 2;
  await withRetries('click', retries, log, async () => {
    await locator.waitFor({ state: 'visible', timeout: options?.timeout ?? 30_000 });
    await locator.click({
      timeout: options?.timeout ?? 30_000,
      force: options?.force,
      trial: options?.trial,
    });
  });
}

export async function fill(
  locator: Locator,
  value: string,
  options?: FillOptions & { logger?: Logger },
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'fill' });
  const retries = options?.retries ?? 2;
  await withRetries('fill', retries, log, async () => {
    await locator.waitFor({ state: 'visible', timeout: options?.timeout ?? 30_000 });
    if (options?.clear !== false) {
      await locator.fill('');
    }
    await locator.fill(value, { timeout: options?.timeout ?? 30_000 });
  });
}

export async function safeGoto(
  page: Page,
  url: string,
  options?: GotoOptions & { logger?: Logger },
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'safeGoto' });
  const retries = options?.retries ?? 2;
  await withRetries(`goto ${url}`, retries, log, async () => {
    await page.goto(url, {
      timeout: options?.timeout ?? 60_000,
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
    });
  });
}

/**
 * Assert the page URL host matches the public expected host.
 * Catches Auth.js / NEXTAUTH_URL misconfig that redirects to LAN IPs (punimtag #57).
 */
export async function waitForUrlHost(
  page: Page,
  expectedHost: string,
  options?: { timeout?: number; logger?: Logger },
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'waitForUrlHost' });
  const timeout = options?.timeout ?? 30_000;
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const host = new URL(page.url()).hostname;
    if (host === expectedHost) {
      log.info('url host ok', { host });
      return;
    }
    await sleep(100);
  }
  const actual = new URL(page.url()).hostname;
  throw new Error(
    `Expected URL host "${expectedHost}" but got "${actual}" (${page.url()}). ` +
      `This often means NEXTAUTH_URL / AUTH_URL points at a LAN address.`,
  );
}

export function assertPublicHost(urlOrHost: string, forbidPrivate = true): void {
  let host = urlOrHost;
  try {
    host = new URL(urlOrHost).hostname;
  } catch {
    // already a hostname
  }
  if (forbidPrivate && isPrivateHost(host)) {
    throw new Error(`Refusing private host "${host}" for public e2e`);
  }
}

export interface SetFilesViaChooserOptions {
  timeout?: number;
  logger?: Logger;
}

/**
 * Open a native file chooser (slash-menu Image, Upload button, etc.), then
 * set the chosen files. Starts waiting for `filechooser` before running
 * `trigger` so the event is never missed.
 */
export async function setFilesViaChooser(
  page: Page,
  trigger: () => Promise<void>,
  files: string | string[],
  options?: SetFilesViaChooserOptions,
): Promise<void> {
  const log = options?.logger ?? createLogger({ name: 'setFilesViaChooser' });
  const timeout = options?.timeout ?? 30_000;
  const paths = Array.isArray(files) ? files : [files];
  log.debug('setFilesViaChooser', { files: paths.length, timeout });

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout }),
    trigger(),
  ]);
  await chooser.setFiles(paths);
}

/**
 * Thin Page Object base — prefer getByRole / getByTestId in subclasses.
 */
export class BasePage {
  protected readonly log: Logger;

  constructor(
    protected readonly page: Page,
    protected readonly baseUrl: string,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger({ name: this.constructor.name });
  }

  async open(path = '/'): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    this.log.info('open', { url });
    await safeGoto(this.page, url, { logger: this.log });
  }

  async click(locator: Locator, options?: ClickOptions): Promise<void> {
    await click(locator, { ...options, logger: this.log });
  }

  async fill(locator: Locator, value: string, options?: FillOptions): Promise<void> {
    await fill(locator, value, { ...options, logger: this.log });
  }

  async expectHost(expectedHost: string, timeout?: number): Promise<void> {
    await waitForUrlHost(this.page, expectedHost, { timeout, logger: this.log });
  }

  async screenshot(name: string): Promise<Buffer> {
    this.log.info('screenshot', { name });
    return this.page.screenshot({ fullPage: true, type: 'png' });
  }
}
