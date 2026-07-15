# Network helpers (page traffic)

`ApiClient` *makes* HTTP calls from the test process. These helpers watch what the
**browser page** itself does during UI flows — spy/mock specific calls, and fail
tests that silently collect 4xx/5xx in the background.

## Spy / mock — `interceptNetworkCall`

Set up **before** the action that triggers the request:

```ts
import { interceptNetworkCall } from '@levkin/playkit';

const users = interceptNetworkCall({
  page,
  method: 'GET',
  url: '**/api/users',
});

await page.goto('/users');
const { status, responseJson } = await users;
expect(status).toBe(200);
```

Stub a response:

```ts
const users = interceptNetworkCall({
  page,
  url: '**/api/users',
  fulfillResponse: {
    status: 200,
    body: [{ id: 1, name: 'e2e' }],
  },
});

await page.goto('/users');
await users;
await expect(page.getByText('e2e')).toBeVisible();
```

## Background errors — `startNetworkErrorMonitor`

Catches silent backend failures while the UI still looks fine:

```ts
import { startNetworkErrorMonitor } from '@levkin/playkit';

test('dashboard stays clean', async ({ page }) => {
  const net = startNetworkErrorMonitor(page, {
    excludePatterns: [/analytics\.google\.com/, 'sentry.io'],
  });
  try {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  } finally {
    net.assertNoErrors(); // throws with method/status/url list if any 4xx/5xx
  }
});
```

Opt out of known 4xx paths via `excludePatterns` (substring or `RegExp`).
Call `assertNoErrors()` (or `stop()`) so the listener is removed.
