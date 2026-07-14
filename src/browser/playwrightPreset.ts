import type { PlaywrightTestConfig } from '@playwright/test';

type UseOptions = NonNullable<PlaywrightTestConfig['use']>;

/**
 * Artifact defaults for CI / flaky debugging: retain trace/screenshot/video on failure.
 * Merge into `defineConfig({ use: { ...playkitFailureArtifacts() } })`.
 */
export function playkitFailureArtifacts(
  overrides: Partial<UseOptions> = {},
): Partial<UseOptions> {
  return {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...overrides,
  };
}
