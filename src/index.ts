/**
 * @levkin/playkit — shared Playwright + API test kit
 */

export {
  loadConfig,
  isPrivateHost,
  type PlaykitConfig,
} from './config/loadConfig.js';
export {
  RETRY_PRESETS,
  resolveRetryPreset,
  type RetryPreset,
  type RetryPresetName,
} from './config/retryPresets.js';
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
  saveStorageState,
  storageStateUse,
  cookiesToBearer,
  playkitFailureArtifacts,
  interceptNetworkCall,
  startNetworkErrorMonitor,
  NetworkErrorMonitor,
  matchesExcludePattern,
  dedupeNetworkErrors,
  globToRegExp,
  responseMatchesFilter,
  COMMON_NOISE_PATTERNS,
  byAriaLabel,
  clickByAriaLabel,
  withDialog,
  fillContentEditable,
  runPersistentSession,
  isBrowserCrashError,
  setFilesViaChooser,
  type ClickOptions,
  type FillOptions,
  type GotoOptions,
  type SetFilesViaChooserOptions,
  type StorageStateLike,
  type FulfillResponse,
  type InterceptNetworkCallOptions,
  type InterceptedNetworkCall,
  type NetworkError,
  type NetworkErrorMonitorOptions,
  type ByAriaLabelOptions,
  type WithDialogHandlers,
  type WithDialogOptions,
  type FillContentEditableOptions,
  type PersistentSessionOptions,
  type LaunchedSession,
} from './browser/index.js';

export {
  ApiClient,
  assertSchema,
  SchemaAssertionError,
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

export {
  MailtrapClient,
  loadMailtrapConfig,
  MailpitClient,
  loadMailpitConfig,
  createMailInbox,
  readMailHtml,
  extractLinks,
  firstLinkMatching,
  type MailtrapConfig,
  type MailtrapMessage,
  type WaitForEmailOptions,
  type MailpitConfig,
  type MailpitMessage,
  type WaitForMailpitOptions,
  type MailInbox,
} from './mail/index.js';
