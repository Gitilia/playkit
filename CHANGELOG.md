# Changelog

## Unreleased

- Ops: npm publish is hard-required in the tag release job (removed soft-fail); `NPM_PUBLISH_TOKEN` + Outline update scopes documented as done in `docs/OPS.md` / `ROADMAP.md`

## 0.4.0 — 2026-07-15

- **CLI** — `playkit init` scaffolds `e2e/` + CI snippet; `playkit smoke` post-deploy public-host + health ping
- **Retry presets** — `PLAYKIT_RETRY_PRESET=strictCi|flakyNetwork|default` wired through `loadConfig` (`RETRY_PRESETS` export)
- **Gitea npm registry** — `publishConfig` + release-job `npm publish`; consumer docs in `docs/NPM_REGISTRY.md`
- Docs: CONSUMER/ROADMAP updated for v0.4; selftest + Outline sync remain as of 0.3.x line

## 0.3.1 — 2026-07-14

- **Network interception / error monitor** — `interceptNetworkCall()`, `startNetworkErrorMonitor()` (see `docs/NETWORK.md`)
- Tests: expand coverage for network helpers — `NetworkErrorMonitor` (record/dedupe/exclude/minStatus/assert), `interceptNetworkCall` (spy/fulfill/handler/method continue/non-JSON), plus `globToRegExp` / `responseMatchesFilter`
- Docs: `docs/OUTLINE.md` checklist (update Outline QA & Dev Playkit page on each release); `docs/IDEAS.md` for OSS-borrowed backlog; adoption pause (no new consumer repos until soak)
- CI: add tag-triggered `release` job (`.gitea/workflows/ci.yml`) — re-runs build/test, verifies tag matches `package.json` version and `CHANGELOG.md` documents it, creates a Gitea release with an `npm pack` tarball attached. Requires a one-time `RELEASE_TOKEN` Actions secret.
- Docs: bump install pin examples from `v0.1.0` to `v0.3.0` (README, CONSUMER.md)
- Docs: lead with Mailpit (homelab default) instead of Mailtrap in README email section; use `createMailInbox()` + `readMailHtml()` in the example instead of a provider-specific client
- Ops: Pushgateway + `live-playkit` Grafana board now provisioned via ansible `deploy/observability/`
- **Self-test suite** — `selftest/` fake site + Playwright CI job (`docs/SELFTEST.md`)
- **Outline sync** — `scripts/outline-sync-playkit.py`

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
- Metrics: `TimingCollector` + Pushgateway helper
- Config/logging helpers + consumer docs
