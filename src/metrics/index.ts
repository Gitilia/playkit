import { createLogger, type Logger } from '../logging/logger.js';

export interface TimingSample {
  name: string;
  durationMs: number;
  ok: boolean;
  labels?: Record<string, string>;
}

/**
 * Collect action/navigation timings for Prometheus histograms / summaries.
 */
export class TimingCollector {
  private readonly samples: TimingSample[] = [];
  private readonly log: Logger;

  constructor(logger?: Logger) {
    this.log = logger ?? createLogger({ name: 'TimingCollector' });
  }

  async measure<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const started = Date.now();
    let ok = true;
    try {
      return await fn();
    } catch (err) {
      ok = false;
      throw err;
    } finally {
      const durationMs = Date.now() - started;
      this.samples.push({ name, durationMs, ok, labels });
      this.log.info('timing', { name, durationMs, ok, ...labels });
    }
  }

  getSamples(): TimingSample[] {
    return [...this.samples];
  }

  clear(): void {
    this.samples.length = 0;
  }

  /**
   * Render Prometheus text exposition (suitable for Pushgateway POST body).
   */
  toPrometheusText(extraLabels: Record<string, string> = {}): string {
    const lines: string[] = [
      '# HELP playkit_action_duration_ms Duration of playkit-measured actions in milliseconds',
      '# TYPE playkit_action_duration_ms gauge',
      '# HELP playkit_action_ok 1 if last sample for this action succeeded',
      '# TYPE playkit_action_ok gauge',
    ];

    for (const s of this.samples) {
      const labels = { ...extraLabels, ...(s.labels ?? {}), action: s.name };
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${escapeLabel(String(v))}"`)
        .join(',');
      lines.push(`playkit_action_duration_ms{${labelStr}} ${s.durationMs}`);
      lines.push(`playkit_action_ok{${labelStr}} ${s.ok ? 1 : 0}`);
    }

    return lines.join('\n') + '\n';
  }
}

function escapeLabel(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

export interface MetricsPushOptions {
  pushgatewayUrl: string;
  job: string;
  grouping?: Record<string, string>;
  logger?: Logger;
}

/**
 * Push metrics to a Prometheus Pushgateway.
 * Example URL: http://10.0.10.24:9091
 */
export async function pushPrometheusMetrics(
  collector: TimingCollector,
  options: MetricsPushOptions,
): Promise<void> {
  const log = options.logger ?? createLogger({ name: 'metrics' });
  const base = options.pushgatewayUrl.replace(/\/$/, '');
  const grouping = options.grouping ?? {};
  const pathParts = [`job/${encodeURIComponent(options.job)}`];
  for (const [k, v] of Object.entries(grouping)) {
    pathParts.push(`${encodeURIComponent(k)}/${encodeURIComponent(v)}`);
  }
  const url = `${base}/metrics/${pathParts.join('/')}`;
  const body = collector.toPrometheusText(grouping);

  log.info('pushing metrics', { url, bytes: body.length, samples: collector.getSamples().length });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pushgateway returned ${res.status}: ${text.slice(0, 300)}`);
  }
}
