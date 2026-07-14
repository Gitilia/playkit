# playkit roadmap

Living plan for making `@levkin/playkit` more useful across Levkin repos.

## Now (v0.3) — shipped

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

## Later (v0.5+) — professional polish

- [ ] **Web Vitals** (LCP/CLS/INP) collection via Playwright CDP + metrics labels
- [ ] **A11y** — axe-core wrapper as optional peer
- [ ] **Visual regression** — screenshot baselines with per-project bucket (MinIO)
- [ ] **Contract testing** — OpenAPI-driven API suite generator
- [ ] **Multi-browser matrix helper** — chromium/firefox/webkit project factory
- [ ] **Flake quarantine** — annotate + quarantine flaky tests with Grafana panel
- [ ] **Hermes / Mattermost reporter** — post failed suite summary to `#eng`
- [ ] **Infisical SDK helper** — `loadSecretsFromInfisical()` for local runs (machine identity)
- [ ] **JUnit + HTML report merge** — single artifact for Gitea PR checks
- [ ] **Network assert helpers** — fail if request hits `10.x` / wrong host after navigation
