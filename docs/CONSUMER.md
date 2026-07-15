# How to adopt @levkin/playkit in an app repo

## 1. Depend on a release

```bash
npm install git+https://git.levkin.ca/ilia/playkit.git#v0.3.1
npm install -D @playwright/test
npx playwright install chromium
```

## 2. Layout

```
e2e/
  playwright.config.ts
  fixtures.ts
  pages/LoginPage.ts
  tests/auth.signout.spec.ts
  api/health.spec.ts
```

## 3. Config (Infisical → CI secrets)

Store in Infisical `LevkinOps` / `Development` (path e.g. `/playkit/punimtag`):

- `PLAYKIT_BASE_URL=https://punimtagdev.levkin.ca`
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (dedicated test user — not a human’s password)
- optional `PLAYKIT_PUSHGATEWAY_URL=http://10.0.10.24:9091` (Pushgateway on the observability LXC — config lives in ansible `deploy/observability/`; scrape job + `live-playkit` Grafana board are wired, but confirm `make deploy-observability` has actually been run before turning `PLAYKIT_METRICS_ENABLED=true` on in CI)
- for mail specs: `PLAYKIT_MAIL_PROVIDER=mailpit` (default) + `MAILPIT_BASE_URL` / `MAILPIT_USER` / `MAILPIT_PASSWORD`, or `MAILTRAP_*` for SaaS

Sync into Gitea Actions secrets for the consumer repo.

## 4. CI job sketch

```yaml
e2e:
  runs-on: [homelab, self-hosted, linux]
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npx playwright test
      env:
        PLAYKIT_BASE_URL: ${{ secrets.PLAYKIT_BASE_URL }}
        E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
        E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

## 5. Deploy rule

PR → CI green (unit + e2e when secrets present) → merge → documented deploy script.  
Do not claim “fixed” from a bare `pct exec` hotfix without a follow-up PR.

**Adoption pause:** do not add playkit to other app repos until punimtag + kit CI
have soaked for a few days. See `docs/IDEAS.md`.
