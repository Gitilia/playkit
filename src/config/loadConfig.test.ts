import { describe, expect, it } from 'vitest';
import { isPrivateHost, loadConfig } from './loadConfig.js';
import { redactSecrets } from '../logging/redact.js';
import { TimingCollector } from '../metrics/index.js';

describe('isPrivateHost', () => {
  it('detects LAN and localhost', () => {
    expect(isPrivateHost('10.0.10.121')).toBe(true);
    expect(isPrivateHost('192.168.1.1')).toBe(true);
    expect(isPrivateHost('172.16.0.2')).toBe(true);
    expect(isPrivateHost('localhost')).toBe(true);
    expect(isPrivateHost('punimtagdev.levkin.ca')).toBe(false);
  });
});

describe('loadConfig', () => {
  it('requires base url', () => {
    expect(() => loadConfig({})).toThrow(/PLAYKIT_BASE_URL/);
  });

  it('rejects private expected host by default', () => {
    expect(() =>
      loadConfig({
        PLAYKIT_BASE_URL: 'http://10.0.10.121:3001',
      }),
    ).toThrow(/private/);
  });

  it('accepts public https host', () => {
    const cfg = loadConfig({
      PLAYKIT_BASE_URL: 'https://punimtagdev.levkin.ca',
      PLAYKIT_PROJECT: 'punimtag',
    });
    expect(cfg.expectedHost).toBe('punimtagdev.levkin.ca');
    expect(cfg.project).toBe('punimtag');
  });
});

describe('redactSecrets', () => {
  it('redacts password and authorization', () => {
    const out = redactSecrets({
      password: '123456',
      Authorization: 'Bearer abc.def',
      email: 'a@b.c',
    });
    expect(out.password).toBe('[REDACTED]');
    expect(out.Authorization).toBe('[REDACTED]');
    expect(out.email).toBe('a@b.c');
  });
});

describe('TimingCollector', () => {
  it('records timings and renders prometheus text', async () => {
    const t = new TimingCollector();
    await t.measure('goto', async () => 1);
    const text = t.toPrometheusText({ project: 'demo' });
    expect(text).toContain('playkit_action_duration_ms');
    expect(text).toContain('project="demo"');
    expect(text).toContain('action="goto"');
  });
});
