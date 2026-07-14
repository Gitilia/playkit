# Changelog

## 0.3.0 — 2026-07-14

- **Zod schema asserts** — `assertSchema()` + optional `schema` on `ApiClient` requests
- **storageState helpers** — `saveStorageState()`, `storageStateUse()`
- **Trace-on-failure preset** — `playkitFailureArtifacts()` for Playwright `use`
- Mailpit adapter marked shipped (was in 0.2.1)

## 0.2.1 — 2026-07-14

- **Mailpit** client + `createMailInbox()` (prefer homelab Mailpit, else Mailtrap SaaS)

## 0.2.0 — 2026-07-14

- **Mailtrap** Email Testing client: `MailtrapClient`, `waitForEmail`, `extractLinks` / `firstLinkMatching`
- Export path `@levkin/playkit/mail`

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
