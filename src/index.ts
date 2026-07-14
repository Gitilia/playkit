/**
 * @levkin/playkit — shared Playwright + API test kit
 */

export {
  loadConfig,
  isPrivateHost,
  type PlaykitConfig,
} from './config/loadConfig.js';
export { createLogger, type Logger, type LogLevel } from './logging/logger.js';
export { redactSecrets } from './logging/redact.js';

export {
  BasePage,
  click,
  fill,
  safeGoto,
  waitForVisible,
  waitForHidden,
  waitForUrlHost,
  assertPublicHost,
  type ClickOptions,
  type FillOptions,
  type GotoOptions,
} from './browser/index.js';

export {
  ApiClient,
  type ApiClientOptions,
  type ApiRequestOptions,
  type ApiResponse,
} from './api/index.js';

export {
  TimingCollector,
  pushPrometheusMetrics,
  type TimingSample,
  type MetricsPushOptions,
} from './metrics/index.js';

export {
  createPlaykitRuntime,
  createPlaykitFixtures,
  type PlaykitFixtures,
} from './fixtures/index.js';
