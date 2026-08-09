import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import type { Logger } from '../logging/logger.js';
import {
  BasePage,
  assertPublicHost,
  click,
  fill,
  safeGoto,
  setFilesViaChooser,
  waitForUrlHost,
} from './actions.js';

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
};

function mockLocator(overrides: Partial<Record<'waitFor' | 'click' | 'fill', unknown>> = {}) {
  return {
    waitFor: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as Locator;
}

describe('click', () => {
  it('waits for visibility then clicks with the given options', async () => {
    const locator = mockLocator();
    await click(locator, { timeout: 5_000, force: true, logger: silentLogger });
    expect(locator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 5_000 });
    expect(locator.click).toHaveBeenCalledWith({ timeout: 5_000, force: true, trial: undefined });
  });

  it('retries after a failed attempt and succeeds', async () => {
    const clickFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('intercepted'))
      .mockResolvedValueOnce(undefined);
    const locator = mockLocator({ click: clickFn });
    await click(locator, { retries: 1, logger: silentLogger });
    expect(clickFn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once retries are exhausted', async () => {
    const clickFn = vi.fn().mockRejectedValue(new Error('detached'));
    const locator = mockLocator({ click: clickFn });
    await expect(click(locator, { retries: 1, logger: silentLogger })).rejects.toThrow('detached');
    expect(clickFn).toHaveBeenCalledTimes(2);
  });
});

describe('fill', () => {
  it('clears the field before filling by default', async () => {
    const locator = mockLocator();
    await fill(locator, 'hello', { logger: silentLogger });
    const fillMock = locator.fill as ReturnType<typeof vi.fn>;
    expect(fillMock).toHaveBeenCalledTimes(2);
    expect(fillMock.mock.calls[0]).toEqual(['']);
    expect(fillMock.mock.calls[1][0]).toBe('hello');
  });

  it('skips the clear step when clear: false', async () => {
    const locator = mockLocator();
    await fill(locator, 'hello', { clear: false, logger: silentLogger });
    const fillMock = locator.fill as ReturnType<typeof vi.fn>;
    expect(fillMock).toHaveBeenCalledTimes(1);
    expect(fillMock.mock.calls[0][0]).toBe('hello');
  });
});

describe('safeGoto', () => {
  it('navigates with the configured waitUntil and retries transient failures', async () => {
    const goto = vi
      .fn()
      .mockRejectedValueOnce(new Error('net::ERR_CONNECTION_RESET'))
      .mockResolvedValueOnce(undefined);
    const page = { goto } as unknown as Page;
    await safeGoto(page, 'https://app.levkin.ca/login', {
      retries: 1,
      waitUntil: 'load',
      logger: silentLogger,
    });
    expect(goto).toHaveBeenCalledTimes(2);
    expect(goto).toHaveBeenLastCalledWith('https://app.levkin.ca/login', {
      timeout: 60_000,
      waitUntil: 'load',
    });
  });
});

describe('waitForUrlHost', () => {
  it('resolves when the page URL is already on the expected host', async () => {
    const page = { url: () => 'https://app.levkin.ca/dashboard' } as unknown as Page;
    await expect(
      waitForUrlHost(page, 'app.levkin.ca', { logger: silentLogger }),
    ).resolves.toBeUndefined();
  });

  it('throws a descriptive error naming both hosts when the host never matches', async () => {
    const page = { url: () => 'http://10.255.255.1:3000/dashboard' } as unknown as Page;
    await expect(
      waitForUrlHost(page, 'app.levkin.ca', { timeout: 0, logger: silentLogger }),
    ).rejects.toThrow(/Expected URL host "app\.levkin\.ca" but got "10\.255\.255\.1"/);
  });
});

describe('assertPublicHost', () => {
  it('accepts a public URL and a bare public hostname', () => {
    expect(() => assertPublicHost('https://punimtagdev.levkin.ca/login')).not.toThrow();
    expect(() => assertPublicHost('punimtagdev.levkin.ca')).not.toThrow();
  });

  it.each(['https://10.255.255.1:3000', 'http://localhost:3000', 'https://192.168.1.10', '127.0.0.1'])(
    'rejects private host %s',
    (input) => {
      expect(() => assertPublicHost(input)).toThrow(/Refusing private host/);
    },
  );

  it('allows private hosts when forbidPrivate is false (intentional LAN runs)', () => {
    expect(() => assertPublicHost('http://10.255.255.1:3000', false)).not.toThrow();
  });
});

describe('BasePage', () => {
  function makePage(url = 'https://app.levkin.ca/') {
    const goto = vi.fn(async () => undefined);
    const page = { goto, url: () => url } as unknown as Page;
    return { page, goto };
  }

  it('open() joins base URL and path without doubling slashes', async () => {
    const { page, goto } = makePage();
    const basePage = new BasePage(page, 'https://app.levkin.ca/', silentLogger);
    await basePage.open('/users');
    expect(goto).toHaveBeenCalledWith('https://app.levkin.ca/users', expect.anything());
  });

  it('open() adds the missing leading slash for relative paths', async () => {
    const { page, goto } = makePage();
    const basePage = new BasePage(page, 'https://app.levkin.ca', silentLogger);
    await basePage.open('users');
    expect(goto).toHaveBeenCalledWith('https://app.levkin.ca/users', expect.anything());
  });

  it('open() passes absolute http(s) URLs through untouched', async () => {
    const { page, goto } = makePage();
    const basePage = new BasePage(page, 'https://app.levkin.ca', silentLogger);
    await basePage.open('https://other.levkin.ca/health');
    expect(goto).toHaveBeenCalledWith('https://other.levkin.ca/health', expect.anything());
  });

  it('click() and fill() delegate to the retried helpers', async () => {
    const { page } = makePage();
    const basePage = new BasePage(page, 'https://app.levkin.ca', silentLogger);
    const locator = mockLocator();
    await basePage.click(locator);
    await basePage.fill(locator, 'value');
    expect(locator.click).toHaveBeenCalledTimes(1);
    expect(locator.fill).toHaveBeenCalledWith('value', { timeout: 30_000 });
  });
});

describe('setFilesViaChooser', () => {
  it('waits for filechooser, runs trigger, then setFiles', async () => {
    const setFiles = vi.fn(async () => undefined);
    const waitForEvent = vi.fn(async () => ({ setFiles }));
    const page = { waitForEvent } as unknown as Page;
    const trigger = vi.fn(async () => undefined);

    await setFilesViaChooser(page, trigger, '/tmp/a.jpg', { logger: silentLogger, timeout: 5_000 });

    expect(waitForEvent).toHaveBeenCalledWith('filechooser', { timeout: 5_000 });
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(setFiles).toHaveBeenCalledWith(['/tmp/a.jpg']);
  });

  it('accepts multiple file paths', async () => {
    const setFiles = vi.fn(async () => undefined);
    const page = {
      waitForEvent: vi.fn(async () => ({ setFiles })),
    } as unknown as Page;

    await setFilesViaChooser(page, async () => undefined, ['/a.png', '/b.png'], {
      logger: silentLogger,
    });
    expect(setFiles).toHaveBeenCalledWith(['/a.png', '/b.png']);
  });
});
