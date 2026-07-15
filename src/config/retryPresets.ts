/**
 * Named retry / timeout profiles for consumers and `loadConfig`.
 *
 * Use via `PLAYKIT_RETRY_PRESET=strictCi|flakyNetwork` or
 * `applyRetryPreset(config, 'flakyNetwork')`.
 */
export type RetryPresetName = 'strictCi' | 'flakyNetwork' | 'default';

export interface RetryPreset {
  name: RetryPresetName;
  /** Passed to click/fill/safeGoto retries (0 = fail fast). */
  actionRetries: number;
  defaultTimeoutMs: number;
  description: string;
}

export const RETRY_PRESETS: Record<RetryPresetName, RetryPreset> = {
  default: {
    name: 'default',
    actionRetries: 2,
    defaultTimeoutMs: 30_000,
    description: 'Balanced defaults (dev + typical CI)',
  },
  strictCi: {
    name: 'strictCi',
    actionRetries: 0,
    defaultTimeoutMs: 15_000,
    description: 'Fail fast — expose flakes instead of masking them',
  },
  flakyNetwork: {
    name: 'flakyNetwork',
    actionRetries: 4,
    defaultTimeoutMs: 45_000,
    description: 'Extra retries/timeouts for congested or remote CI',
  },
};

export function resolveRetryPreset(
  name: string | undefined,
): RetryPreset {
  if (!name) return RETRY_PRESETS.default;
  const key = name as RetryPresetName;
  if (!(key in RETRY_PRESETS)) {
    throw new Error(
      `Unknown PLAYKIT_RETRY_PRESET "${name}". Use: ${Object.keys(RETRY_PRESETS).join(', ')}`,
    );
  }
  return RETRY_PRESETS[key];
}
