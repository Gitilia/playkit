import { resolveRetryPreset, type RetryPresetName } from './retryPresets.js';

export interface PlaykitConfig {
  /** Public UI base URL (must be what users open in the browser). */
  baseUrl: string;
  /** API base URL (defaults to baseUrl). */
  apiBaseUrl: string;
  /** Expected hostname — sign-out / redirects must stay on this host. */
  expectedHost: string;
  /** Reject private LAN hosts (10/8, 172.16/12, 192.168/16, localhost). */
  forbidPrivateHosts: boolean;
  project: string;
  env: string;
  defaultTimeoutMs: number;
  actionRetries: number;
  /** Active retry preset name (from PLAYKIT_RETRY_PRESET). */
  retryPreset: RetryPresetName;
  metrics: {
    enabled: boolean;
    pushgatewayUrl?: string;
    job: string;
  };
}

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v == null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    throw new Error(`Invalid URL in playkit config: ${url}`);
  }
}

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)) return true;
  return false;
}

/**
 * Load kit config from environment (CI injects from Infisical / Actions secrets).
 *
 * Required: PLAYKIT_BASE_URL (or BASE_URL)
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): PlaykitConfig {
  const baseUrl = (env.PLAYKIT_BASE_URL || env.BASE_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error(
      'playkit: set PLAYKIT_BASE_URL (or BASE_URL) to the public app URL, e.g. https://punimtagdev.levkin.ca',
    );
  }

  const apiBaseUrl = (env.PLAYKIT_API_BASE_URL || env.API_BASE_URL || baseUrl).replace(/\/$/, '');
  const expectedHost = env.PLAYKIT_EXPECTED_HOST || hostFromUrl(baseUrl);
  const preset = resolveRetryPreset(env.PLAYKIT_RETRY_PRESET);
  // Explicit env overrides win over preset values.
  const forbidPrivateHosts = parseBool(env.PLAYKIT_FORBID_PRIVATE_HOSTS, true);
  const defaultTimeoutMs = Number(env.PLAYKIT_TIMEOUT_MS || preset.defaultTimeoutMs);
  const actionRetries = Number(
    env.PLAYKIT_ACTION_RETRIES !== undefined && env.PLAYKIT_ACTION_RETRIES !== ''
      ? env.PLAYKIT_ACTION_RETRIES
      : preset.actionRetries,
  );

  if (forbidPrivateHosts && isPrivateHost(expectedHost)) {
    throw new Error(
      `playkit: expected host "${expectedHost}" looks private. Public e2e must use a public hostname (Kolby #57 class bug). Set PLAYKIT_FORBID_PRIVATE_HOSTS=false only for intentional LAN runs.`,
    );
  }

  return {
    baseUrl,
    apiBaseUrl,
    expectedHost,
    forbidPrivateHosts,
    project: env.PLAYKIT_PROJECT || env.CI_PROJECT || 'unknown',
    env: env.PLAYKIT_ENV || env.APP_ENV || 'dev',
    defaultTimeoutMs,
    actionRetries,
    retryPreset: preset.name,
    metrics: {
      enabled: parseBool(env.PLAYKIT_METRICS_ENABLED, false),
      pushgatewayUrl: env.PLAYKIT_PUSHGATEWAY_URL || env.PUSHGATEWAY_URL,
      job: env.PLAYKIT_METRICS_JOB || 'playkit',
    },
  };
}
