# Changelog

## 0.1.1 — 2026-07-14

- Add `prepare` script so git installs build `dist/` for consumers

## 0.1.0 — 2026-07-14

Initial release.

- Browser: `BasePage`, `click`, `fill`, `safeGoto`, visibility waits, `waitForUrlHost`, `assertPublicHost`
- API: `ApiClient` with status expectations and secret redaction
- Logging: structured JSON logger
- Metrics: `TimingCollector` + Prometheus Pushgateway push
- Config: `loadConfig()` with private-host guard
- Docs: README, ROADMAP, Grafana dashboard stub, consumer examples
