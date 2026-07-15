/**
 * Observe / mock page network traffic, and fail tests that silently hit 4xx/5xx.
 *
 * Distinct from ApiClient (which *makes* requests): these helpers watch what
 * the browser itself does during UI flows.
 *
 * Inspired by seontechnologies/playwright-utils network utilities — leaner
 * surface for Levkin consumers.
 */
import type { Page, Request, Response, Route } from '@playwright/test';
import { createLogger, type Logger } from '../logging/logger.js';

export interface FulfillResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface InterceptNetworkCallOptions {
  page: Page;
  // Playwright URL glob (e.g. "**" + "/api/users") or RegExp.
  url: string | RegExp;
  method?: string;
  /** When set, fulfill the route with this mock instead of hitting the network. */
  fulfillResponse?: FulfillResponse;
  /** Custom route handler (overrides fulfillResponse when both provided). */
  handler?: (route: Route, request: Request) => Promise<void>;
  timeout?: number;
}

export interface InterceptedNetworkCall {
  request: Request;
  response: Response | null;
  status: number;
  responseJson: unknown;
  requestJson: unknown;
}

function methodMatches(request: Request, method?: string): boolean {
  if (!method) return true;
  return request.method().toUpperCase() === method.toUpperCase();
}

async function parseJsonSafe(raw: string | null): Promise<unknown> {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function responsePredicate(
  response: Response,
  url: string | RegExp,
  method?: string,
): boolean {
  if (!methodMatches(response.request(), method)) return false;
  if (url instanceof RegExp) return url.test(response.url());
  // Prefer Playwright's built-in glob matching when possible via URL string compare.
  try {
    return response.url().match(new RegExp(
      url
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/?]*'),
    )) !== null;
  } catch {
    return response.url().includes(String(url));
  }
}

/**
 * Spy on (or stub) the next matching page network call.
 *
 * Set this up *before* the action that triggers the request, then await the
 * returned promise after that action:
 *
 *   const call = interceptNetworkCall({ page, url: '**' + '/api/users' });
 *   await page.goto('/users');
 *   const { status, responseJson } = await call;
 */
export function interceptNetworkCall(
  options: InterceptNetworkCallOptions,
): Promise<InterceptedNetworkCall> {
  const { page, url, method, fulfillResponse, handler, timeout = 30_000 } = options;
  const log = createLogger({ name: 'interceptNetworkCall' });
  const needsRoute = Boolean(handler || fulfillResponse);

  // Register the response waiter first so we never miss a fast request.
  const responsePromise = page.waitForResponse(
    (res) => responsePredicate(res, url, method),
    { timeout },
  );

  const setup = needsRoute
    ? page.route(url, async (route, request) => {
        if (!methodMatches(request, method)) {
          await route.continue();
          return;
        }
        if (handler) {
          await handler(route, request);
          return;
        }
        const body =
          typeof fulfillResponse!.body === 'string' || Buffer.isBuffer(fulfillResponse!.body)
            ? fulfillResponse!.body
            : fulfillResponse!.body === undefined
              ? undefined
              : JSON.stringify(fulfillResponse!.body);
        await route.fulfill({
          status: fulfillResponse!.status ?? 200,
          headers: {
            'content-type': 'application/json',
            ...fulfillResponse!.headers,
          },
          body: body as string | Buffer | undefined,
        });
      })
    : Promise.resolve();

  return setup
    .then(() => responsePromise)
    .then(async (response) => {
      const request = response.request();
      const requestJson = await parseJsonSafe(request.postData());
      let responseJson: unknown;
      try {
        responseJson = await response.json();
      } catch {
        responseJson = undefined;
      }
      log.info(needsRoute ? 'intercept fulfilled/handled' : 'intercept observed', {
        method: request.method(),
        url: request.url(),
        status: response.status(),
      });
      return {
        request,
        response,
        status: response.status(),
        responseJson,
        requestJson,
      };
    })
    .finally(async () => {
      if (needsRoute) {
        await page.unroute(url).catch(() => undefined);
      }
    });
}

export interface NetworkError {
  url: string;
  status: number;
  method: string;
  timestamp: string;
}

export interface NetworkErrorMonitorOptions {
  /** Skip matching URLs (string substring or RegExp). */
  excludePatterns?: Array<string | RegExp>;
  /** Minimum status to treat as an error (default 400). */
  minStatus?: number;
  logger?: Logger;
}

/** Pure helper — exported for unit tests. */
export function matchesExcludePattern(
  url: string,
  patterns: Array<string | RegExp> = [],
): boolean {
  return patterns.some((p) => (typeof p === 'string' ? url.includes(p) : p.test(url)));
}

/** Deduplicate by method + status + url. */
export function dedupeNetworkErrors(errors: NetworkError[]): NetworkError[] {
  const seen = new Set<string>();
  const out: NetworkError[] = [];
  for (const e of errors) {
    const key = `${e.method}:${e.status}:${e.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export class NetworkErrorMonitor {
  private readonly errors: NetworkError[] = [];
  private readonly onResponse: (response: Response) => void;
  private stopped = false;

  constructor(
    private readonly page: Page,
    private readonly options: NetworkErrorMonitorOptions = {},
  ) {
    const log = options.logger ?? createLogger({ name: 'NetworkErrorMonitor' });
    const minStatus = options.minStatus ?? 400;
    const exclude = options.excludePatterns ?? [];

    this.onResponse = (response: Response) => {
      if (this.stopped) return;
      const status = response.status();
      if (status < minStatus) return;
      const requestUrl = response.url();
      if (matchesExcludePattern(requestUrl, exclude)) return;
      const entry: NetworkError = {
        url: requestUrl,
        status,
        method: response.request().method(),
        timestamp: new Date().toISOString(),
      };
      this.errors.push(entry);
      log.warn('network error observed', { ...entry });
    };

    this.page.on('response', this.onResponse);
  }

  getErrors(): NetworkError[] {
    return dedupeNetworkErrors(this.errors);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.page.off('response', this.onResponse);
  }

  /**
   * Throw if any 4xx/5xx (after exclusions / dedupe) were observed.
   * Call in afterEach or at the end of a test that should remain "clean".
   */
  assertNoErrors(): void {
    const errs = this.getErrors();
    this.stop();
    if (errs.length === 0) return;
    const lines = errs.map((e) => `  ${e.method} ${e.status} ${e.url}`).join('\n');
    throw new Error(
      `Network errors detected: ${errs.length} request(s) failed.\nFailed requests:\n${lines}`,
    );
  }
}

/** Start listening for HTTP error responses on a page. */
export function startNetworkErrorMonitor(
  page: Page,
  options?: NetworkErrorMonitorOptions,
): NetworkErrorMonitor {
  return new NetworkErrorMonitor(page, options);
}
