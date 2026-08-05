/**
 * Example UI pattern (not executed in kit CI — consumers own Playwright projects).
 *
 * Critical assert: after sign-out, URL host must remain the public host.
 * This is the failure mode from punimtag #57 (redirect to 10.255.255.1:3001).
 */
import { test, expect } from '@playwright/test';
import { loadConfig, waitForUrlHost, assertPublicHost, TimingCollector } from '../../src/index.js';

test.describe('public host smoke (pattern)', () => {
  test('base URL is public and reachable', async ({ page }) => {
    const config = loadConfig();
    const timings = new TimingCollector();
    assertPublicHost(config.baseUrl, config.forbidPrivateHosts);

    await timings.measure('goto_home', () => page.goto(config.baseUrl));
    await waitForUrlHost(page, config.expectedHost);
    expect(page.url()).toContain(config.expectedHost);
  });
});
