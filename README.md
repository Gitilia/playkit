# @levkin/playkit

Shared **Playwright + API** test kit for Levkin / homelab apps.

Use it as a library from any consumer repo (punimtag, MirrorMatch, …). App-specific Page Objects and specs stay in the consumer; reusable helpers, logging, API client, performance timings, and Grafana/Prometheus metrics live here.

## Install (consumer)

```bash
# git tag dependency (until a private npm registry is wired)
npm install git+https://git.levkin.ca/ilia/playkit.git#v0.1.0

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
| `PLAYKIT_PROJECT` | no | Metric / log label |
| `PLAYKIT_ENV` | no | Metric / log label (`dev`/`qa`/`prod`) |
| `PLAYKIT_METRICS_ENABLED` | no | Push timings to Pushgateway |
| `PLAYKIT_PUSHGATEWAY_URL` | if metrics | e.g. `http://10.0.10.24:9091` |
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
| `MailtrapClient` / `waitForEmail` | Assert password-reset / verify emails in Mailtrap sandbox |

## Mailtrap (email testing)

```ts
import { MailtrapClient, firstLinkMatching, assertPublicHost } from '@levkin/playkit';

const mail = MailtrapClient.fromEnv();
if (!mail) throw new Error('set MAILTRAP_API_TOKEN + MAILTRAP_INBOX_ID');

const after = new Date();
// … trigger forgot-password in the app …
const msg = await mail.waitForEmail({ to: 'e2e@example.com', subject: /reset/i, after });
const html = await mail.getHtml(msg.id, msg.html_path);
const link = firstLinkMatching(html, /reset-password/);
assertPublicHost(link!);
```

**Important:** Mailtrap only sees mail if the app’s SMTP points at the sandbox
(`sandbox.smtp.mailtrap.io` + inbox credentials). Sending via Gmail to a real
address will not appear in the sandbox. See ansible `docs/hardening/SECRETS.md`.

## Develop this repo

```bash
npm ci
npm run typecheck
npm test
npm run build
```

## Release

1. Bump `version` in `package.json`
2. Update `CHANGELOG.md`
3. Tag `vX.Y.Z` and push — consumers pin the tag

## License

MIT
