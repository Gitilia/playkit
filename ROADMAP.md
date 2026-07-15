# playkit roadmap

Living plan for making `@levkin/playkit` more useful across Levkin repos.

## Now (v0.3.1) — shipped

- [x] Browser helpers with retries (`click`, `fill`, `safeGoto`, visibility waits)
- [x] `BasePage` for Page Objects
- [x] Public-host guards (`assertPublicHost`, `waitForUrlHost`) — Kolby #57 class
- [x] `ApiClient` with redacted structured logging
- [x] `TimingCollector` + Prometheus Pushgateway export
- [x] Config from env (Infisical/CI-friendly)
- [x] `createPlaykitRuntime()` for one-shot wiring
- [x] Unit tests (vitest) + Gitea Actions CI
- [x] Starter Grafana dashboard JSON
- [x] Consumer docs + API/UI examples
- [x] **Mailtrap / Mailpit** — `createMailInbox()`, `waitForEmail`, link extraction
- [x] **Auth storage state helpers** — `saveStorageState` / `storageStateUse`
- [x] **Trace-on-failure preset** — `playkitFailureArtifacts()`
- [x] **Schema assertions** — Zod `assertSchema` + `ApiClient` `schema` option

## Next (v0.4) — high value

- [ ] **Private Gitea npm registry publish** — `npm install @levkin/playkit` without git URLs
- [ ] **Consumer template** — `npx @levkin/playkit init` scaffolding `e2e/` + CI snippet
- [ ] **Deploy-smoke CLI** — `playkit smoke --project punimtag` post-deploy gate
- [ ] **Retry policy presets** — flaky-network vs strict-CI profiles
- [x] **Self-test against a real fake site** — `selftest/` tiny Node app + Playwright suite in CI (`docs/SELFTEST.md`)
- [x] **Network interception / network error monitor** — `interceptNetworkCall()`, `startNetworkErrorMonitor()` / `assertNoErrors()` (see `docs/NETWORK.md`)
- [x] **Tag-triggered release workflow** — `.gitea/workflows/ci.yml` `release` job now runs on `vX.Y.Z` tag push: re-verifies build/test, checks tag == `package.json` version, checks `CHANGELOG.md` has that version's section, then creates a Gitea release (npm-pack tarball attached) via the API. Needs a one-time `RELEASE_TOKEN` Actions secret on this repo (see README "Release"). Still open: `build-and-test`/`secret-scan` also re-run on the tag push (same `on.push` trigger) — harmless redundancy, not wired to skip.
- [x] **Live docs** — Outline page under **QA & Dev** (`notes.levkin.ca`). Sync with `python3 scripts/outline-sync-playkit.py` (checklist in `docs/OUTLINE.md`).
- [x] **Pushgateway + dashboard wired in ansible** — applied via `make deploy-observability` (LXC `10.0.10.24`): `pushgateway` container, Prometheus scrape job, Grafana `live-playkit` board. Flip consumer CI metrics with `PLAYKIT_METRICS_ENABLED=true` + `PLAYKIT_PUSHGATEWAY_URL=http://10.0.10.24:9091`.

## Adoption pause

**No new consumer repos until we soak.** Keep playing through punimtag e2e + kit CI for a few days (release job, Pushgateway/dashboard apply, network helpers) before migrating `screening` / `slack-sieve` / `portfolio`. See `docs/IDEAS.md`.

## Later (v0.5+) — professional polish

- [ ] **Web Vitals** (LCP/CLS/INP) collection via Playwright CDP + metrics labels
- [ ] **A11y** — axe-core wrapper as optional peer
- [ ] **Visual regression** — screenshot baselines with per-project bucket (MinIO)
- [ ] **Contract testing** — OpenAPI-driven API suite generator
- [ ] **Multi-browser matrix helper** — chromium/firefox/webkit project factory
- [ ] **Flake quarantine** — annotate + quarantine flaky tests with Grafana panel (depends on burn-in — see below)
- [ ] **Hermes / Mattermost reporter** — post failed suite summary to `#eng`
- [ ] **Infisical SDK helper** — `loadSecretsFromInfisical()` for local runs (machine identity)
- [ ] **JUnit + HTML report merge** — single artifact for Gitea PR checks
- [ ] **Network assert helpers** — fail if request hits `10.x` / wrong host after navigation

## Ideas pulled from similar OSS tools (2026-07 research)

See `docs/IDEAS.md` for expanded notes. Summary:

- [x] **Network interception / network error monitor** — shipped (above)
- [ ] **Test burn-in (flake detection)** — rerun a spec N times; mechanism for flake quarantine
- [ ] **Scheduled synthetic monitoring** — evaluate `playwright-exporter` before bespoke smoke CLI
- [ ] **Functional-core-for-everything audit** — optional function wrappers alongside class APIs
- ~~Remote-write vs Pushgateway~~ — moot while Pushgateway is the path
- Confirmed sane (no action): OpenAPI / axe / visual reg already under v0.5+
