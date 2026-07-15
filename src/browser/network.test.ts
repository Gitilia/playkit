import { describe, expect, it, vi } from 'vitest';
import type { Page, Request, Response, Route } from '@playwright/test';
import {
  dedupeNetworkErrors,
  globToRegExp,
  interceptNetworkCall,
  matchesExcludePattern,
  responseMatchesFilter,
  startNetworkErrorMonitor,
  type NetworkError,
} from './network.js';

function mockRequest(overrides: {
  method?: string;
  url?: string;
  postData?: string | null;
} = {}): Request {
  return {
    method: () => overrides.method ?? 'GET',
    url: () => overrides.url ?? 'https://example.com/api',
    postData: () => overrides.postData ?? null,
  } as unknown as Request;
}

function mockResponse(overrides: {
  status?: number;
  url?: string;
  method?: string;
  json?: unknown;
  postData?: string | null;
  jsonThrows?: boolean;
}): Response {
  const request = mockRequest({
    method: overrides.method,
    url: overrides.url,
    postData: overrides.postData,
  });
  return {
    status: () => overrides.status ?? 200,
    url: () => overrides.url ?? 'https://example.com/api',
    request: () => request,
    json: async () => {
      if (overrides.jsonThrows) throw new Error('not json');
      return overrides.json ?? { ok: true };
    },
  } as unknown as Response;
}

type ResponseListener = (response: Response) => void;

function createMockPage() {
  const listeners = new Map<string, ResponseListener>();
  const page = {
    on: vi.fn((event: string, fn: ResponseListener) => {
      listeners.set(event, fn);
    }),
    off: vi.fn((event: string, fn: ResponseListener) => {
      if (listeners.get(event) === fn) listeners.delete(event);
    }),
    waitForResponse: vi.fn(),
    route: vi.fn(async () => undefined),
    unroute: vi.fn(async () => undefined),
    emitResponse(response: Response) {
      listeners.get('response')?.(response);
    },
    hasResponseListener() {
      return listeners.has('response');
    },
  };
  return page as typeof page & Page;
}

describe('matchesExcludePattern', () => {
  it('matches substring and regex', () => {
    expect(matchesExcludePattern('https://cdn.example.com/x.js', ['cdn.example.com'])).toBe(
      true,
    );
    expect(matchesExcludePattern('https://api.example.com/users', [/\/users$/])).toBe(true);
    expect(matchesExcludePattern('https://api.example.com/ok', ['cdn', /\/missing/])).toBe(
      false,
    );
  });

  it('returns false for empty patterns', () => {
    expect(matchesExcludePattern('https://example.com', [])).toBe(false);
  });
});

describe('dedupeNetworkErrors', () => {
  it('keeps first of identical method/status/url', () => {
    const raw: NetworkError[] = [
      {
        url: 'https://api/x',
        status: 500,
        method: 'GET',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      {
        url: 'https://api/x',
        status: 500,
        method: 'GET',
        timestamp: '2026-01-01T00:00:01.000Z',
      },
      {
        url: 'https://api/x',
        status: 404,
        method: 'GET',
        timestamp: '2026-01-01T00:00:02.000Z',
      },
    ];
    const out = dedupeNetworkErrors(raw);
    expect(out).toHaveLength(2);
    expect(out[0]?.status).toBe(500);
    expect(out[1]?.status).toBe(404);
  });
});

describe('globToRegExp / responseMatchesFilter', () => {
  it('matches Playwright-style globs', () => {
    const re = globToRegExp('**/api/users');
    expect('https://punimtagdev.levkin.ca/api/users').toMatch(re);
    expect('https://punimtagdev.levkin.ca/api/posts').not.toMatch(re);
    expect(globToRegExp('**/api/users/*').test('https://app/api/users/1')).toBe(true);
  });

  it('filters by url string glob and method', () => {
    const getUsers = mockResponse({
      url: 'https://app.example.com/api/users',
      method: 'GET',
      status: 200,
    });
    const postUsers = mockResponse({
      url: 'https://app.example.com/api/users',
      method: 'POST',
      status: 201,
    });
    expect(responseMatchesFilter(getUsers, '**/api/users', 'GET')).toBe(true);
    expect(responseMatchesFilter(postUsers, '**/api/users', 'GET')).toBe(false);
    expect(responseMatchesFilter(postUsers, /\/api\/users$/, 'POST')).toBe(true);
  });
});

describe('NetworkErrorMonitor', () => {
  it('records 4xx/5xx, skips 2xx, and assertNoErrors throws', () => {
    const page = createMockPage();
    const net = startNetworkErrorMonitor(page);

    page.emitResponse(mockResponse({ status: 200, url: 'https://app/ok' }));
    page.emitResponse(mockResponse({ status: 500, url: 'https://app/boom', method: 'GET' }));
    page.emitResponse(mockResponse({ status: 500, url: 'https://app/boom', method: 'GET' })); // dedupe
    page.emitResponse(mockResponse({ status: 404, url: 'https://app/missing', method: 'GET' }));

    expect(net.getErrors()).toHaveLength(2);
    expect(() => net.assertNoErrors()).toThrow(/Network errors detected: 2/);
    expect(page.hasResponseListener()).toBe(false); // stopped
  });

  it('assertNoErrors is a no-op when clean', () => {
    const page = createMockPage();
    const net = startNetworkErrorMonitor(page);
    page.emitResponse(mockResponse({ status: 204, url: 'https://app/ok' }));
    expect(() => net.assertNoErrors()).not.toThrow();
  });

  it('honors excludePatterns and minStatus', () => {
    const page = createMockPage();
    const net = startNetworkErrorMonitor(page, {
      excludePatterns: ['sentry.io', /analytics\./],
      minStatus: 500,
    });

    page.emitResponse(mockResponse({ status: 404, url: 'https://app/missing' })); // below min
    page.emitResponse(mockResponse({ status: 500, url: 'https://sentry.io/api/1' })); // excluded
    page.emitResponse(mockResponse({ status: 503, url: 'https://analytics.example.com/x' })); // excluded
    page.emitResponse(mockResponse({ status: 502, url: 'https://app/fail' }));

    expect(net.getErrors()).toEqual([
      expect.objectContaining({ status: 502, url: 'https://app/fail' }),
    ]);
    net.stop();
  });

  it('stop() ignores further responses', () => {
    const page = createMockPage();
    const net = startNetworkErrorMonitor(page);
    net.stop();
    page.emitResponse(mockResponse({ status: 500, url: 'https://app/late' }));
    expect(net.getErrors()).toHaveLength(0);
  });
});

describe('interceptNetworkCall', () => {
  it('spies on a matching response without installing a route', async () => {
    const page = createMockPage();
    const response = mockResponse({
      status: 200,
      url: 'https://app.example.com/api/users',
      method: 'GET',
      json: [{ id: 1 }],
      postData: null,
    });
    page.waitForResponse.mockImplementation(async (pred: (r: Response) => boolean) => {
      expect(pred(response)).toBe(true);
      return response;
    });

    const result = await interceptNetworkCall({
      page,
      url: '**/api/users',
      method: 'GET',
    });

    expect(page.route).not.toHaveBeenCalled();
    expect(page.unroute).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.responseJson).toEqual([{ id: 1 }]);
    expect(result.requestJson).toBeUndefined();
  });

  it('installs fulfill route and unroutes in finally', async () => {
    const page = createMockPage();
    const response = mockResponse({
      status: 200,
      url: 'https://app.example.com/api/users',
      method: 'GET',
      json: [{ id: 9, name: 'stub' }],
    });
    page.waitForResponse.mockResolvedValue(response);
    page.route.mockImplementation(async (_url: string | RegExp, handler: (route: Route, request: Request) => Promise<void>) => {
      const route = {
        continue: vi.fn(async () => undefined),
        fulfill: vi.fn(async () => undefined),
      } as unknown as Route;
      await handler(route, mockRequest({ method: 'GET', url: response.url() }));
      expect(route.fulfill).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          body: JSON.stringify([{ id: 9, name: 'stub' }]),
        }),
      );
    });

    const result = await interceptNetworkCall({
      page,
      url: '**/api/users',
      fulfillResponse: { status: 200, body: [{ id: 9, name: 'stub' }] },
    });

    expect(page.route).toHaveBeenCalledOnce();
    expect(page.unroute).toHaveBeenCalledOnce();
    expect(result.responseJson).toEqual([{ id: 9, name: 'stub' }]);
  });

  it('uses custom handler and parses request JSON', async () => {
    const page = createMockPage();
    const response = mockResponse({
      status: 401,
      url: 'https://app.example.com/api/login',
      method: 'POST',
      json: { error: 'nope' },
      postData: JSON.stringify({ user: 'e2e' }),
    });
    page.waitForResponse.mockResolvedValue(response);
    const handler = vi.fn(async (route: Route) => {
      await route.fulfill({ status: 401, body: '{"error":"nope"}' });
    });
    page.route.mockImplementation(async (_url, routeHandler) => {
      const route = {
        continue: vi.fn(),
        fulfill: vi.fn(async () => undefined),
      } as unknown as Route;
      await routeHandler(route, mockRequest({ method: 'POST', postData: '{"user":"e2e"}' }));
    });

    const result = await interceptNetworkCall({
      page,
      url: /\/api\/login$/,
      method: 'POST',
      handler,
    });

    expect(handler).toHaveBeenCalledOnce();
    expect(result.status).toBe(401);
    expect(result.requestJson).toEqual({ user: 'e2e' });
    expect(result.responseJson).toEqual({ error: 'nope' });
  });

  it('tolerates non-JSON response bodies', async () => {
    const page = createMockPage();
    const response = mockResponse({
      status: 200,
      url: 'https://app.example.com/health',
      jsonThrows: true,
    });
    page.waitForResponse.mockResolvedValue(response);

    const result = await interceptNetworkCall({ page, url: '**/health' });
    expect(result.status).toBe(200);
    expect(result.responseJson).toBeUndefined();
  });

  it('continues non-matching method on fulfill route', async () => {
    const page = createMockPage();
    const response = mockResponse({
      status: 200,
      url: 'https://app.example.com/api/users',
      method: 'GET',
    });
    page.waitForResponse.mockResolvedValue(response);
    const continueFn = vi.fn(async () => undefined);
    page.route.mockImplementation(async (_url, routeHandler) => {
      const route = { continue: continueFn, fulfill: vi.fn() } as unknown as Route;
      await routeHandler(route, mockRequest({ method: 'OPTIONS' }));
    });

    await interceptNetworkCall({
      page,
      url: '**/api/users',
      method: 'GET',
      fulfillResponse: { body: [] },
    });
    expect(continueFn).toHaveBeenCalledOnce();
  });
});
