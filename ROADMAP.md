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
- [ ] **Self-test against a real fake site** — today's unit tests only mock HTTP/mail; `examples/` specs are explicitly *not run* in kit CI. Stand up a tiny demo app (or point at an existing DEV LXC) and run the browser/API/mail helpers against it in CI, so a regression in `BasePage`/`ApiClient`/`assertPublicHost` is caught before a consumer pins a broken tag.
- [x] **Tag-triggered release workflow** — `.gitea/workflows/ci.yml` `release` job now runs on `vX.Y.Z` tag push: re-verifies build/test, checks tag == `package.json` version, checks `CHANGELOG.md` has that version's section, then creates a Gitea release (npm-pack tarball attached) via the API. Needs a one-time `GITEA_TOKEN` Actions secret on this repo (see README "Release"). Still open: `build-and-test`/`secret-scan` also re-run on the tag push (same `on.push` trigger) — harmless redundancy, not wired to skip.
- [ ] **Live docs** — see `docs/CONSUMER.md` decision note; likely an Outline page under the existing "QA & Dev" collection (`notes.levkin.ca`, already deployed with API automation) rather than a new static site.
- [x] **Pushgateway + dashboard wired in ansible** — `pushgateway` service, Prometheus scrape job, and a generated `live-playkit` Grafana board now live in ansible `deploy/observability/` (superseding the old standalone `dashboards/playkit-overview.json`, which is removed). Ops still needs to run `make deploy-observability` against the LXC before `PLAYKIT_METRICS_ENABLED=true` does anything in CI — check with the ansible repo owner before flipping that on.

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

## Ideas pulled from similar OSS tools (2026-07 research)

Comparing playkit against `seontechnologies/playwright-utils` (102★, functional-core/fixture-shell design), `kitium-ai/playwright-helpers` (enterprise-grade, contract/a11y/chaos), `maravexa/playwright-exporter` (scheduled synthetic monitoring), and `vitalics/playwright-prometheus-remote-write-reporter` (remote-write instead of Pushgateway). What's worth taking:

- [ ] **Functional-core-for-everything audit** — playkit already does this for the runtime object (`createPlaykitRuntime` wraps plain functions), but individual utilities like `ApiClient` are class-only. `playwright-utils` ships every utility as *both* a standalone function (explicit deps, easy to unit test) and a fixture wrapper. Worth an audit pass on `ApiClient`/`MailpitClient` to see which could get a functional export alongside the class.
- [ ] **Network interception / network error monitor** — `playwright-utils` has dedicated helpers for asserting on intercepted requests and flagging console/network errors during a test, distinct from `ApiClient` (which is for *making* requests, not observing the page's own traffic). Genuinely missing capability, not just a naming difference.
- [ ] **Test burn-in (flake detection)** — `playwright-utils`' "burn-in" utility reruns a spec N times before merge to catch flaky tests early. This *is* the mechanism for the existing "Flake quarantine" item above — implement burn-in first, quarantine consumes its output.
- [ ] **Scheduled synthetic monitoring** — `playwright-exporter` runs suites on a cron and exposes pass/fail + duration as Prometheus metrics independent of any Pushgateway. This overlaps heavily with the "Deploy-smoke CLI" item (`playkit smoke --project punimtag`) — evaluate reusing/wrapping `playwright-exporter` on a schedule instead of building a bespoke CLI from scratch.
- [ ] **Remote-write as a Pushgateway alternative** — `playwright-prometheus-remote-write-reporter` pushes via Prometheus remote-write instead of a Pushgateway (no separate service to run/scrape). Now moot for us since Pushgateway is wired into `deploy/observability` (2026-07-14), but worth remembering if that stack ever needs simplifying.
- Confirmed sane (no action): OpenAPI contract testing, axe-core a11y, and visual regression are already on this roadmap and match what `kitium-ai/playwright-helpers` treats as "enterprise" table stakes — no new items needed, just execute what's already listed.
