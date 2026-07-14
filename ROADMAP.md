# playkit roadmap

Living plan for making `@levkin/playkit` more useful across Levkin repos.

## Now (v0.1) — shipped in this repo

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

## Next (v0.2) — high value

- [ ] **Mailosaur / Mailpit adapter** — assert “email sent” without depending on JRCC Outlook or Spamhaus-blocked IPs
- [ ] **Auth storage state helpers** — save/load Playwright `storageState` for admin vs viewer roles
- [ ] **Trace-on-failure preset** — one-liner Playwright config merge (`trace: 'retain-on-failure'`, screenshot, video)
- [ ] **Schema assertions** — optional Zod (or AJV) helpers on `ApiClient` responses
- [ ] **Private Gitea npm registry publish** — `npm install @levkin/playkit` without git URLs
- [ ] **Consumer template** — `npx @levkin/playkit init` scaffolding `e2e/` + CI snippet
- [ ] **Deploy-smoke CLI** — `playkit smoke --project punimtag` post-deploy gate (health + public host + login)
- [ ] **Retry policy presets** — flaky-network vs strict-CI profiles

## Later (v0.3+) — professional polish

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

## Ideas backlog (not scheduled)

| Idea | Why |
|------|-----|
| Shared Page Object for Authentik login | Many apps share SSO |
| Chaos toggles (throttle network, offline) | Catch brittle UIs |
| Seeded persona library (`admin`, `viewer`, `unverified`) | Consistent fixtures across apps |
| “Deploy smoke” CLI | Post-deploy one-command gate before paging humans |
| Recorded HAR attach on API failure | Faster debugging |
| Benchmark budgets in CI | Fail if p95 login > N ms |
| Docs site (VitePress) with cookbook recipes | Onboarding other repos faster |
| Email delivery probe (SMTP accept ≠ inbox) | Catch Spamhaus / bounce class of #56 |
| `NEXTAUTH_URL` / canonical URL checker | Static env lint before e2e |
| Tag-based suite filters (`@smoke`, `@auth`, `@mail`) | Fast PR vs nightly depth |
| Parallel shard helper for self-hosted runners | Keep CI under 5m as suite grows |
| Golden-path checklist generator | Per-app “must pass before claim fixed” |
| Kuma + playkit correlation IDs | Tie synthetic monitor blips to e2e runs |
| Diffable timing baselines in git | Spot regressions without Grafana |

## Punimtag as first consumer (follow-up, not this repo)

1. Add `e2e/` depending on `@levkin/playkit@v0.1.0`
2. Specs: public host after sign-out; health API; optional forgot-password with mail trap
3. CI job on PR + scheduled DEV smoke
4. Deploy rule: PR → green CI → merge → deploy script (no silent `pct exec` “done”)

## Observability

Pushgateway → Prometheus on LXC 240 (`observability` @ `10.0.10.24`) → Grafana dashboard `dashboards/playkit-overview.json`.

Metrics (v0.1):

- `playkit_action_duration_ms{project,env,action}`
- `playkit_action_ok{project,env,action}`

## Success criteria

A bug like “sign-out redirects to LAN IP” or “email accepted by SMTP but bounced by Outlook” cannot be marked fixed without:

1. Public-URL browser assertion (playkit host guards)
2. Delivery/inbox assertion (mail adapter — v0.2) or documented mail-trap substitute
3. Green consumer CI on the merge commit
