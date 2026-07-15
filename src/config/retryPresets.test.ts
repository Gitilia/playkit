import { describe, expect, it } from 'vitest';
import { resolveRetryPreset, RETRY_PRESETS } from './retryPresets.js';

describe('retry presets', () => {
  it('defaults when unset', () => {
    expect(resolveRetryPreset(undefined).name).toBe('default');
    expect(resolveRetryPreset('').name).toBe('default');
  });

  it('resolves known presets', () => {
    expect(resolveRetryPreset('strictCi').actionRetries).toBe(0);
    expect(resolveRetryPreset('flakyNetwork').actionRetries).toBeGreaterThan(
      RETRY_PRESETS.default.actionRetries,
    );
  });

  it('rejects unknown names', () => {
    expect(() => resolveRetryPreset('nope')).toThrow(/Unknown PLAYKIT_RETRY_PRESET/);
  });
});
