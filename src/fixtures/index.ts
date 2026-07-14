import { loadConfig, type PlaykitConfig } from '../config/loadConfig.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { ApiClient } from '../api/client.js';
import { TimingCollector } from '../metrics/index.js';

export interface PlaykitFixtures {
  playkitConfig: PlaykitConfig;
  playkitLog: Logger;
  api: ApiClient;
  timings: TimingCollector;
}

/**
 * Build the standard playkit objects for a test run.
 * Prefer this over inventing per-file wiring.
 *
 * For Playwright `test.extend`, see docs/CONSUMER.md — consumers usually
 * wrap these in their own fixtures file.
 */
export function createPlaykitRuntime(env: NodeJS.ProcessEnv = process.env): PlaykitFixtures {
  const playkitConfig = loadConfig(env);
  const playkitLog = createLogger({
    name: 'e2e',
    bindings: { project: playkitConfig.project, env: playkitConfig.env },
  });
  const api = new ApiClient({
    baseUrl: playkitConfig.apiBaseUrl,
    timeoutMs: playkitConfig.defaultTimeoutMs,
    logger: playkitLog.child({ component: 'api' }),
  });
  const timings = new TimingCollector(playkitLog.child({ component: 'timings' }));
  return { playkitConfig, playkitLog, api, timings };
}

/** @deprecated alias — use createPlaykitRuntime */
export function createPlaykitFixtures(): PlaykitFixtures {
  return createPlaykitRuntime();
}
