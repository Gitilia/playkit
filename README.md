# @levkin/playkit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-ready-45ba4b)](https://playwright.dev/)

**Shared Playwright + API test helpers** — resilient UI actions, API client, timings, and metrics used across Levkin apps.

> Public mirror: [github.com/Gitilia/playkit](https://github.com/Gitilia/playkit) · issues welcome here; CI/publish run on the private forge.

## Install (consumer)

```bash
# Preferred — Gitea npm registry (docs/NPM_REGISTRY.md)
npm install @levkin/playkit@0.4.0

# Fallback — git tag
npm install git+https://git.levkin.ca/ilia/playkit.git#v0.4.0

# Scaffold e2e/
npx @levkin/playkit init

# peer
npm install -D @playwright/test
npx playwright install chromium
```

```ts
// e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { createPlaykitRuntime, type PlaykitFixtures } from '@levkin/playkit';

const runtime = createPlaykitRuntime();

export const test = base.extend<PlaykitFixtures>({
  playkitConfig: async ({}, use) => use(runtime.playkitConfig),
  playkitLog: async ({}, use) => use(runtime.playkitLog),
  api: async ({}, use) => use(runtime.api),
  timings: async ({}, use) => use(runtime.timings),
});

export { expect } from '@playwright/test';
```

```ts
// e2e/auth.signout.spec.ts — catches NEXTAUTH_URL → 10.x redirect (punimtag #57)
import { assertPublicHost, waitForUrlHost } from '@levkin/playkit';
import { test } from './fixtures';

test('sign-out stays on public host', async ({ page, playkitConfig, timings }) => {
  assertPublicHost(playkitConfig.baseUrl);
  await timings.measure('open', () => page.goto(playkitConfig.baseUrl));
  // … login …
  // … sign out …
  await waitForUrlHost(page, playkitConfig.expectedHost);
});
```

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `PLAYKIT_BASE_URL` / `BASE_URL` | yes | Public UI URL (e.g. `https://punimtagdev.levkin.ca`) |
| `PLAYKIT_API_BASE_URL` | no | Defaults to base URL |
| `PLAYKIT_EXPECTED_HOST` | no | Defaults to host of base URL |
| `PLAYKIT_FORBID_PRIVATE_HOSTS` | no | Default `true` — refuse `10.x` / localhost as expected host |
| `PLAYKIT_RETRY_PRESET` | no | `default` \| `strictCi` \| `flakyNetwork` (timeouts/retries) |
| `PLAYKIT_ACTION_RETRIES` / `PLAYKIT_TIMEOUT_MS` | no | Override preset values |
| `PLAYKIT_PROJECT` | no | Metric / log label |
| `PLAYKIT_ENV` | no | Metric / log label (`dev`/`qa`/`prod`) |
| `PLAYKIT_METRICS_ENABLED` | no | Push timings to Pushgateway |
| `PLAYKIT_PUSHGATEWAY_URL` | if metrics | e.g. `http://<pushgateway-host>:9091` |
| `PLAYKIT_LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` |

**Secrets:** put test credentials and pushgateway tokens in Infisical (`LevkinOps`) and sync into Gitea Actions — see ansible `docs/hardening/SECRETS.md`. Never commit passwords.

## What’s in the box

| Module | Role |
|--------|------|
| `BasePage`, `click` / `fill` / `safeGoto` | Retried browser actions + Page Object base |
| `waitForUrlHost` / `assertPublicHost` | Guard against LAN redirect bugs |
| `ApiClient` | Typed HTTP client with status asserts + redacted logs |
| `createLogger` / `redactSecrets` | Structured JSON logs |
| `TimingCollector` / `pushPrometheusMetrics` | Action timings → Prometheus Pushgateway → Grafana |
| `createPlaykitRuntime` | One-shot config + logger + API + timings |
| `createMailInbox` / `MailpitClient` / `MailtrapClient` | Assert password-reset / verify emails (Mailpit homelab trap or Mailtrap SaaS) |
| `assertSchema` | Zod schema asserts (standalone or via `ApiClient` `schema` option) |
| `saveStorageState` / `storageStateUse` | Auth once, reuse across specs |
| `playkitFailureArtifacts` | Trace/video/screenshot only on failure |
| `interceptNetworkCall` | Spy or mock the next matching page network call |
| `byAriaLabel` / `clickByAriaLabel` | Find/click by a regex over `aria-label`, scoped to a page or a narrower locator |
| `withDialog` | Retry an action against a modal that might have silently closed, reopening it first |
| `fillContentEditable` | Type into `contenteditable` rich-text fields with real paragraph breaks |
| `runPersistentSession` | Keep one browser session open across runs via flag files instead of relaunching/re-authenticating |
| `playkit` CLI | `init` scaffold + `smoke` post-deploy gate |

See also `docs/NETWORK.md`, `docs/SELFTEST.md`, `docs/NPM_REGISTRY.md`, `docs/OPS.md`, `docs/IDEAS.md`, `docs/OUTLINE.md`.

## Network (page traffic)

```ts
import { interceptNetworkCall, startNetworkErrorMonitor } from '@levkin/playkit';

const users = interceptNetworkCall({ page, url: '**/api/users' });
const net = startNetworkErrorMonitor(page, { excludePatterns: ['sentry.io'] });
try {
  await page.goto('/users');
  const { status } = await users;
  expect(status).toBe(200);
} finally {
  net.assertNoErrors();
}
```

## Resilient UI automation (third-party / adversarial SPAs)

`click`/`fill`/`waitForVisible` above assume you already have a correct
`Locator` — great when you control the markup and have stable test ids. These
helpers are for the opposite case: driving a third-party site you don't
control, where selectors are dynamic/compound (aria-labels that embed
record-specific text), rich-text fields aren't real `<textarea>`s, modals
close out from under you, and the site has its own bot-detection you'd rather
not retrigger by relaunching the browser on every run.

```ts
import {
  byAriaLabel,
  clickByAriaLabel,
  withDialog,
  fillContentEditable,
  runPersistentSession,
} from '@levkin/playkit';

// aria-label is often compound + record-specific ("Edit Staff Automation
// Engineer at NiyaSoft") — a regex survives per-record text variation better
// than an exact string copied from one DOM dump.
await clickByAriaLabel(page, /Edit.*at NiyaSoft/i);

// Re-open the dialog and retry if it closed underneath you mid-flow.
await withDialog(
  {
    isOpen: () => page.getByRole('button', { name: 'Save' }).isVisible(),
    reopen: () => clickByAriaLabel(page, /Edit.*at NiyaSoft/i),
  },
  async () => {
    await fillContentEditable(page.locator('[contenteditable="true"]').first(), longBioText);
    await page.getByRole('button', { name: 'Save' }).click();
  },
);

// Keep ONE browser open across many runs — touch RUN/READY/CLOSE flag files
// instead of relaunching (and re-triggering captchas) each time.
await runPersistentSession({
  dir: '.session',
  storageStatePath: '.session/state.json',
  launch: async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    return { browser, context, page };
  },
  onRun: async ({ page }) => {
    /* your flow against the live page */
  },
});
```

## Email testing (Mailpit default, Mailtrap optional)

`createMailInbox()` picks the provider from `PLAYKIT_MAIL_PROVIDER` (default
`mailpit`) so specs don't need to know which backend is behind it. Prefer
**Mailpit** — it's our homelab SMTP trap (`<mailpit-host>`, no external
dependency); use Mailtrap only if you specifically want the SaaS sandbox.

```ts
import { createMailInbox, readMailHtml, firstLinkMatching, assertPublicHost } from '@levkin/playkit';

const mail = createMailInbox(); // reads PLAYKIT_MAIL_PROVIDER / MAILPIT_* / MAILTRAP_*
if (!mail) throw new Error('set MAILPIT_BASE_URL (or MAILTRAP_API_TOKEN + MAILTRAP_INBOX_ID)');

const after = new Date();
// … trigger forgot-password in the app …
const msg = await mail.waitForEmail({ to: 'e2e@example.com', subject: /reset/i, after });
const html = await readMailHtml(mail, msg); // normalizes Mailpit vs Mailtrap message shape
const link = firstLinkMatching(html, /reset-password/);
assertPublicHost(link!);
```

**Important:** the mail client only sees mail if the app's SMTP actually
points at that trap (Mailpit `<mailpit-host>:1025` in DEV, or Mailtrap's
`sandbox.smtp.mailtrap.io` + inbox credentials for SaaS). Sending via Gmail to
a real address will not appear in either. See ansible `docs/hardening/SECRETS.md`
(`## Playkit / punimtag e2e secrets`).

## Develop this repo

```bash
npm ci
npm run typecheck
npm test
npm run selftest   # fake site + Chromium (docs/SELFTEST.md)
npm run build
```

## Outline live docs

After each release (or when consumer-facing docs change):

```bash
# needs OUTLINE_URL + OUTLINE_API_KEY (ansible: make vault-export-env)
python3 scripts/outline-sync-playkit.py
```

See `docs/OUTLINE.md`.

## Release

1. Bump `version` in `package.json`
2. Update `CHANGELOG.md` with a `## X.Y.Z` section (the release job extracts this verbatim as release notes)
3. Tag `vX.Y.Z` and push

Pushing the tag triggers `.gitea/workflows/ci.yml`'s `release` job: it re-runs typecheck/test/build, verifies the tag matches `package.json`'s `version` and that `CHANGELOG.md` documents it, then (a) creates a Gitea release with the `npm pack` tarball attached (via `RELEASE_TOKEN`) and (b) **publishes the package to the Gitea npm registry** (`https://git.levkin.ca/api/packages/ilia/npm/`, via `NPM_PUBLISH_TOKEN`, falling back to `RELEASE_TOKEN`). If any check fails, nothing is released or published — fix and re-tag. Consumers install from the registry (`npm install @levkin/playkit@X.Y.Z`, see `docs/NPM_REGISTRY.md`) or pin the git tag (`#vX.Y.Z`) as a fallback.

4. **Update Outline** — `python3 scripts/outline-sync-playkit.py` (checklist: `docs/OUTLINE.md`).

**One-time setup:** add a `RELEASE_TOKEN` secret (repo `Settings → Actions → Secrets` on `ilia/playkit`) scoped to create releases on this repo — separate from the `PLAYKIT_GIT_TOKEN` consumers use to clone it. (Named `RELEASE_TOKEN`, not `GITEA_TOKEN` — Gitea's Actions secrets API rejects that literal name as reserved, same reason `PLAYKIT_GIT_TOKEN` isn't called `GITEA_TOKEN` either.)

## License

MIT
