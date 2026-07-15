# Changelog

## Unreleased

- Tests: expand coverage for network helpers — `NetworkErrorMonitor` (record/dedupe/exclude/minStatus/assert), `interceptNetworkCall` (spy/fulfill/handler/method continue/non-JSON), plus `globToRegExp` / `responseMatchesFilter`
- **Network interception / error monitor** — `interceptNetworkCall()`, `startNetworkErrorMonitor()` (see `docs/NETWORK.md`)
- Docs: `docs/OUTLINE.md` checklist (update Outline QA & Dev Playkit page on each release); `docs/IDEAS.md` for OSS-borrowed backlog; adoption pause (no new consumer repos until soak)
- CI: add tag-triggered `release` job (`.gitea/workflows/ci.yml`) — re-runs build/test, verifies tag matches `package.json` version and `CHANGELOG.md` documents it, creates a Gitea release with an `npm pack` tarball attached. Requires a one-time `GITEA_TOKEN` Actions secret.
- Docs: bump install pin examples from `v0.1.0` to `v0.3.0` (README, CONSUMER.md)
- Docs: lead with Mailpit (homelab default) instead of Mailtrap in README email section; use `createMailInbox()` + `readMailHtml()` in the example instead of a provider-specific client
- Ops: Pushgateway + `live-playkit` Grafana board now provisioned via ansible `deploy/observability/` (pending `make deploy-observability`); removed the standalone `dashboards/playkit-overview.json` (superseded) and the `dashboards` entry from `package.json` `files`

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
