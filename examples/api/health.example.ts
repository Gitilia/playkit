/**
 * Example: API health check pattern consumers copy into their repos.
 * Run: PLAYKIT_BASE_URL=https://punimtagdev.levkin.ca npm run example:api
 */
import { ApiClient, TimingCollector, loadConfig, createLogger, pushPrometheusMetrics } from '../src/index.js';

async function main() {
  const config = loadConfig();
  const log = createLogger({ name: 'example-api', bindings: { project: config.project } });
  const timings = new TimingCollector(log);
  const api = new ApiClient({
    baseUrl: config.apiBaseUrl,
    logger: log,
  });

  const res = await timings.measure('health', () =>
    api.get('/api/health', { expectedStatus: 200 }),
  );

  log.info('health ok', { status: res.status, durationMs: res.durationMs, data: res.data });

  if (config.metrics.enabled && config.metrics.pushgatewayUrl) {
    await pushPrometheusMetrics(timings, {
      pushgatewayUrl: config.metrics.pushgatewayUrl,
      job: config.metrics.job,
      grouping: { project: config.project, env: config.env },
      logger: log,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
