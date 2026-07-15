import { test, expect } from '@playwright/test';
import {
  BasePage,
  assertPublicHost,
  waitForUrlHost,
  TimingCollector,
  interceptNetworkCall,
  startNetworkErrorMonitor,
} from '../../src/index.js';

const baseUrl = process.env.PLAYKIT_BASE_URL || 'http://127.0.0.1:4173';

test.describe('playkit selftest — browser helpers', () => {
  test('BasePage click/fill + public-host relax for localhost', async ({ page }) => {
    // Intentional LAN/selftest: forbidPrivateHosts must be off
    assertPublicHost(baseUrl, false);
    expect(() => assertPublicHost(baseUrl, true)).toThrow(/private host/i);

    const timings = new TimingCollector();
    const home = new BasePage(page, baseUrl);

    await timings.measure('open_home', () => home.open('/'));
    await waitForUrlHost(page, '127.0.0.1');
    await expect(page.getByRole('heading', { name: 'Playkit selftest home' })).toBeVisible();

    await timings.measure('open_form', () => home.open('/form'));
    await home.fill(page.locator('#name'), 'Kolby');
    await home.click(page.locator('#submit'));
    await expect(page.getByText('Hello, Kolby')).toBeVisible();

    expect(timings.getSamples().length).toBeGreaterThanOrEqual(2);
  });

  test('network intercept + error monitor', async ({ page }) => {
    const home = new BasePage(page, baseUrl);
    await home.open('/');

    const items = interceptNetworkCall({
      page,
      method: 'GET',
      url: '**/api/items',
    });
    await page.getByRole('button', { name: 'Load items' }).click();
    const { status, responseJson } = await items;
    expect(status).toBe(200);
    expect(responseJson).toMatchObject({ items: expect.any(Array) });
    await expect(page.getByText('alpha')).toBeVisible();

    const net = startNetworkErrorMonitor(page, {
      excludePatterns: [/\/api\/health/],
    });
    try {
      await page.goto(`${baseUrl}/api/boom`);
      // stay on JSON page — monitor should have recorded 500
    } finally {
      expect(() => net.assertNoErrors()).toThrow(/network errors/i);
    }
  });
});
