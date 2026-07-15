# Kit CI self-test (fake site)

Unit tests in `src/**/*.test.ts` mock HTTP/mail. They do **not** prove that
`BasePage`, `ApiClient`, or network helpers work against a real browser + HTTP
server. The **selftest** suite fills that gap without depending on punimtag DEV.

## Layout

```
selftest/
  demo-site/server.mjs   # tiny Node HTTP app (:4173)
  playwright.config.ts   # starts webServer, runs Chromium
  tests/
    browser.spec.ts      # BasePage, host guards, intercept, error monitor
    api.spec.ts          # ApiClient + Zod schema
```

Mail stays unit-tested only (Mailpit/Mailtrap need live SMTP traps). Selftest
does not start Mailpit.

## Local

```bash
npx playwright install chromium   # once
npm run selftest
```

Env (optional):

| Var | Default |
|-----|---------|
| `PLAYKIT_SELFTEST_PORT` | `4173` |
| `PLAYKIT_BASE_URL` | `http://127.0.0.1:4173` |

Selftest sets `assertPublicHost(..., false)` when touching `127.0.0.1` — consumer
public e2e must keep the default forbid-private behavior.

## CI

`.gitea/workflows/ci.yml` job `selftest` installs Chromium deps and runs
`npm run selftest` after unit tests. Failures there mean a regression in kit
browser/API helpers *before* a consumer pins a broken tag.
