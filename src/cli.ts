/**
 * playkit CLI — `npx @levkin/playkit <command>` / `playkit <command>`
 *
 *   init   Scaffold e2e/ + CI snippet
 *   smoke  Post-deploy public-host + health ping
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const GITEA_NPM = 'https://git.levkin.ca/api/packages/ilia/npm/';

function usage(code = 0): never {
  console.log(`Usage:
  playkit init [dir] [--force]
  playkit smoke [--path /api/health]

Env for smoke:
  PLAYKIT_BASE_URL (required)
  PLAYKIT_API_BASE_URL (optional)
  PLAYKIT_SMOKE_PATH (default /api/health)
  PLAYKIT_RETRY_PRESET (optional: default|strictCi|flakyNetwork)
`);
  process.exit(code);
}

function writeIfMissing(path: string, contents: string, force: boolean): void {
  if (existsSync(path) && !force) {
    console.log(`skip (exists): ${path}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  console.log(`wrote: ${path}`);
}

async function cmdInit(args: string[]): Promise<void> {
  const force = args.includes('--force');
  const dirArg = args.find((a) => !a.startsWith('-'));
  const root = resolve(dirArg || '.');
  const e2e = join(root, 'e2e');

  writeIfMissing(
    join(e2e, 'playwright.config.ts'),
    `import { defineConfig, devices } from '@playwright/test';
import { playkitFailureArtifacts } from '@levkin/playkit';

const baseURL = process.env.PLAYKIT_BASE_URL;
if (!baseURL) throw new Error('set PLAYKIT_BASE_URL');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    ...playkitFailureArtifacts(),
  },
});
`,
    force,
  );

  writeIfMissing(
    join(e2e, 'fixtures.ts'),
    `import { test as base, expect } from '@playwright/test';
import { createPlaykitRuntime, type PlaykitFixtures } from '@levkin/playkit';

const runtime = createPlaykitRuntime();

export const test = base.extend<PlaykitFixtures>({
  playkitConfig: async ({}, use) => use(runtime.playkitConfig),
  playkitLog: async ({}, use) => use(runtime.playkitLog),
  api: async ({}, use) => use(runtime.api),
  timings: async ({}, use) => use(runtime.timings),
});

export { expect };
`,
    force,
  );

  writeIfMissing(
    join(e2e, 'tests', 'health.smoke.spec.ts'),
    `import { test, expect } from '../fixtures';
import { assertPublicHost } from '@levkin/playkit';

test('public host + API health', async ({ playkitConfig, api }) => {
  assertPublicHost(playkitConfig.baseUrl, playkitConfig.forbidPrivateHosts);
  const res = await api.get('/api/health', { expectedStatus: 200 });
  expect(res.ok).toBe(true);
});
`,
    force,
  );

  writeIfMissing(
    join(e2e, 'env-defaults.json'),
    `${JSON.stringify(
      {
        DEFAULT_BASE_URL: 'https://example.levkin.ca',
        DEFAULT_API_BASE_URL: 'https://example.levkin.ca',
      },
      null,
      2,
    )}\n`,
    force,
  );

  writeIfMissing(
    join(e2e, 'ci-snippet.yml'),
    `# Drop into .gitea/workflows/ci.yml (adjust secrets / paths)
e2e:
  runs-on: [homelab, self-hosted, linux]
  defaults:
    run:
      working-directory: e2e
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: npm auth for @levkin
      working-directory: .
      run: |
        echo "@levkin:registry=${GITEA_NPM}" >> ~/.npmrc
        echo "//git.levkin.ca/api/packages/ilia/npm/:_authToken=\${{ secrets.PLAYKIT_GIT_TOKEN }}" >> ~/.npmrc
        npm ci
    - run: npx playwright install --with-deps chromium
    - run: npx playwright test
      env:
        PLAYKIT_BASE_URL: \${{ secrets.PLAYKIT_BASE_URL }}
        PLAYKIT_RETRY_PRESET: strictCi
        CI: 'true'
`.replaceAll('${GITEA_NPM}', GITEA_NPM),
    force,
  );

  writeIfMissing(
    join(root, '.npmrc.playkit.example'),
    `@levkin:registry=${GITEA_NPM}
//git.levkin.ca/api/packages/ilia/npm/:_authToken=\${PLAYKIT_GIT_TOKEN}
`,
    force,
  );

  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const dep =
        pkg.dependencies?.['@levkin/playkit'] ||
        pkg.devDependencies?.['@levkin/playkit'];
      if (!dep) {
        console.log(
          `\nNext: npm i @levkin/playkit --registry ${GITEA_NPM}\n` +
            `  (or copy .npmrc.playkit.example → .npmrc)\n` +
            `Fallback: npm i git+https://git.levkin.ca/ilia/playkit.git#v0.4.0`,
        );
      }
    } catch {
      /* ignore */
    }
  }

  console.log(`\nScaffolded under ${e2e}`);
}

async function cmdSmoke(args: string[]): Promise<void> {
  const pathIdx = args.indexOf('--path');
  const smokePath =
    (pathIdx >= 0 ? args[pathIdx + 1] : undefined) ||
    process.env.PLAYKIT_SMOKE_PATH ||
    '/api/health';

  const mod = await import('./index.js');
  const config = mod.loadConfig();
  mod.assertPublicHost(config.baseUrl, config.forbidPrivateHosts);

  const api = new mod.ApiClient({ baseUrl: config.apiBaseUrl });
  const timings = new mod.TimingCollector();
  const res = await timings.measure('smoke', () =>
    api.get(smokePath, { expectedStatus: 200 }),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        project: config.project,
        env: config.env,
        host: config.expectedHost,
        path: smokePath,
        status: res.status,
        durationMs: res.durationMs,
        retryPreset: config.retryPreset,
      },
      null,
      2,
    ),
  );

  if (config.metrics.enabled && config.metrics.pushgatewayUrl) {
    await mod.pushPrometheusMetrics(timings, {
      pushgatewayUrl: config.metrics.pushgatewayUrl,
      job: config.metrics.job,
      grouping: { project: config.project, env: config.env, suite: 'smoke' },
    });
  }
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === '-h' || cmd === '--help') usage(0);
  if (cmd === 'init') return cmdInit(rest);
  if (cmd === 'smoke') return cmdSmoke(rest);
  console.error(`Unknown command: ${cmd}`);
  usage(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
