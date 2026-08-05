# How to adopt @levkin/playkit in an app repo

## 1. Depend on a release

**Preferred (Gitea npm registry):**

```bash
# .npmrc — see docs/NPM_REGISTRY.md
# @levkin:registry=https://git.levkin.ca/api/packages/ilia/npm/
npm install @levkin/playkit@0.4.0
npm install -D @playwright/test
npx playwright install chromium
```

**Fallback (git pin):**

```bash
npm install git+https://git.levkin.ca/ilia/playkit.git#v0.4.0
```

**Scaffold:**

```bash
npx --yes @levkin/playkit init
# or: playkit init
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
- optional `PLAYKIT_PUSHGATEWAY_URL=http://<pushgateway-host>:9091`
- optional `PLAYKIT_RETRY_PRESET=strictCi|flakyNetwork|default`
- for mail specs: `PLAYKIT_MAIL_PROVIDER=mailpit` (default) + `MAILPIT_*`, or `MAILTRAP_*`

Sync into Gitea Actions secrets for the consumer repo.

## 4. Post-deploy smoke

```bash
PLAYKIT_BASE_URL=https://punimtagdev.levkin.ca playkit smoke
# or: playkit smoke --path /api/health
```

## 5. CI job sketch

See `e2e/ci-snippet.yml` from `playkit init`, or:

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
        PLAYKIT_RETRY_PRESET: strictCi
        E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
        E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
```

## 6. Deploy rule

PR → CI green (unit + e2e when secrets present) → merge → documented deploy script.  
Do not claim “fixed” from a bare `pct exec` hotfix without a follow-up PR.

**Adoption pause:** soak punimtag + kit CI a few more days before migrating
`screening` / `slack-sieve` / `portfolio`. See `docs/IDEAS.md`.
