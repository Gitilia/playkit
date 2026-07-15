# Ideas backlog (from similar OSS tools)

Notes from comparing `@levkin/playkit` to public kits (2026-07). Tracking items
also live in `ROADMAP.md` — this page expands *why* / *how*, not just the checkbox.

## Already shipping (borrowed shape)

- **Network interception + error monitor** — see `docs/NETWORK.md`. Sourced from
  [`playwright-utils`](https://github.com/seontechnologies/playwright-utils)
  (spy/stub + background 4xx/5xx “Sentry for tests”), trimmed to Levkin needs.

## Documented next (not implemented yet)

### Test burn-in (flake detection)

`playwright-utils` “burn-in” re-runs a spec N times (local or CI) before merge.
That is the *mechanism* behind playkit’s “flake quarantine” roadmap item —
implement burn-in first (CLI flag or `PLAYKIT_BURN_IN=N`), then quarantine can
consume “failed once in N” signals into Grafana / Annotations.

### Scheduled synthetic monitoring

[`playwright-exporter`](https://github.com/maravexa/playwright-exporter) runs
Playwright suites on a cron and exposes pass/fail + duration as Prometheus
metrics. Overlaps with “deploy-smoke CLI”. Prefer evaluating that tool (or a
thin wrapper) on a schedule against punimtag DEV **before** writing a bespoke
`playkit smoke` binary.

### Functional-core / fixture-shell audit

`playwright-utils` ships each utility as a plain function *and* a fixture.
Playkit already does this for `createPlaykitRuntime`; `ApiClient` /
`MailpitClient` are class-first. Audit later: keep classes, add thin function
wrappers only where consumers repeatedly wrap them themselves.

### Remote-write vs Pushgateway

[`playwright-prometheus-remote-write-reporter`](https://github.com/vitalics/playwright-prometheus-remote-write-reporter)
avoids a Pushgateway by writing straight into Prometheus. **Moot for now** —
homelab Pushgateway is wired in ansible `deploy/observability` (pending apply).
Keep as a simplification option if Pushgateway ops cost ever hurts.

### Enterprise polish already on the roadmap

Contract testing (OpenAPI), axe-core a11y, and visual regression match what
`kitium-ai/playwright-helpers` treats as table stakes — already listed under
v0.5+ in `ROADMAP.md`; no extra checklist needed.

## Adoption pause

**Do not wire other app repos onto playkit yet.** Shake out punimtag + kit CI
for a few days (metrics path, release job, network helpers) before migrating
`screening` / `slack-sieve` / `portfolio`. Revisit after that soak.
