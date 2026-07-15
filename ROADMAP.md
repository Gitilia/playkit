# playkit roadmap

Living plan for making `@levkin/playkit` more useful across Levkin repos.

## Now (v0.4.0) — this release

- [x] Everything from v0.3.1 (browser/API/mail/network/selftest/Outline/Pushgateway)
- [x] **Private Gitea npm registry publish** — release job `npm publish` to `git.levkin.ca` (`docs/NPM_REGISTRY.md`)
- [x] **Consumer template** — `playkit init` / `npx @levkin/playkit init`
- [x] **Deploy-smoke CLI** — `playkit smoke` (public-host + health GET)
- [x] **Retry policy presets** — `PLAYKIT_RETRY_PRESET=strictCi|flakyNetwork|default`

## Next after soak

- [ ] End adoption pause — migrate first extra consumer (`screening` candidate)
- [ ] Evaluate `playwright-exporter` for scheduled synthetics (may supersede bespoke cron wrappers around `playkit smoke`)

## Done since v0.4.0 (ops)

- [x] **Wire `NPM_PUBLISH_TOKEN` / `write:package`** — `@levkin/playkit@0.4.0` published; Actions secret + `vault_playkit_npm_token`; release job no longer soft-fails (`docs/OPS.md`)
- [x] **Outline API key scopes** — `documents.update` / `delete` working; living page synced via API (`docs/OUTLINE.md`)

## Adoption pause

**No new consumer repos until soak finishes.** Keep punimtag e2e + kit CI + metrics path healthy for a few days. See `docs/IDEAS.md`.

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
- [ ] **Test burn-in (flake detection)** — rerun a spec N times

## Ideas pulled from similar OSS tools (2026-07 research)

See `docs/IDEAS.md`. Summary:

- [x] Network interception / error monitor
- [ ] Test burn-in / flake quarantine
- [ ] Scheduled synthetic monitoring (`playwright-exporter`)
- [ ] Functional-core / fixture-shell audit
- ~~Remote-write vs Pushgateway~~ — moot
