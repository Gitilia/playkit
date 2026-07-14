import { createLogger, type Logger } from '../logging/logger.js';
import { redactSecrets } from '../logging/redact.js';

export interface ApiClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  logger?: Logger;
  /** Extra strings to treat as secrets in logs (tokens, passwords). */
  redactValues?: string[];
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  expectedStatus?: number | number[];
}

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T;
  text: string;
  durationMs: number;
  url: string;
}

function buildUrl(base: string, path: string, query?: ApiRequestOptions['query']): string {
  const u = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

function statusOk(status: number, expected?: number | number[]): boolean {
  if (expected == null) return status >= 200 && status < 300;
  const list = Array.isArray(expected) ? expected : [expected];
  return list.includes(status);
}

export class ApiClient {
  private readonly log: Logger;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;
  private readonly redactValues: string[];

  constructor(private readonly options: ApiClientOptions) {
    this.log = options.logger ?? createLogger({ name: 'ApiClient' });
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.headers = { Accept: 'application/json', ...(options.defaultHeaders ?? {}) };
    this.redactValues = options.redactValues ?? [];
  }

  withAuthBearer(token: string): ApiClient {
    return new ApiClient({
      ...this.options,
      defaultHeaders: {
        ...this.headers,
        Authorization: `Bearer ${token}`,
      },
      redactValues: [...this.redactValues, token],
      logger: this.log,
    });
  }

  async request<T = unknown>(
    method: string,
    path: string,
    opts: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(this.options.baseUrl, path, opts.query);
    const headers: Record<string, string> = { ...this.headers, ...(opts.headers ?? {}) };
    let body: string | undefined;
    if (opts.body !== undefined) {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);
    const started = Date.now();

    this.log.info('api.request', {
      method,
      url: this.safeUrl(url),
      headers: redactSecrets(headers),
    });

    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      const text = await res.text();
      const durationMs = Date.now() - started;
      let data: T;
      try {
        data = text ? (JSON.parse(text) as T) : (undefined as T);
      } catch {
        data = text as unknown as T;
      }

      const response: ApiResponse<T> = {
        status: res.status,
        ok: res.ok,
        headers: res.headers,
        data,
        text,
        durationMs,
        url,
      };

      this.log.info('api.response', {
        method,
        url: this.safeUrl(url),
        status: res.status,
        durationMs,
        body: redactSecrets(typeof data === 'object' ? data : { text: text.slice(0, 500) }),
      });

      if (!statusOk(res.status, opts.expectedStatus)) {
        const want = opts.expectedStatus ?? '2xx';
        throw new Error(
          `API ${method} ${url} expected status ${want} but got ${res.status}: ${text.slice(0, 300)}`,
        );
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  get<T = unknown>(path: string, opts?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, opts);
  }

  post<T = unknown>(path: string, opts?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, opts);
  }

  put<T = unknown>(path: string, opts?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, opts);
  }

  patch<T = unknown>(path: string, opts?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, opts);
  }

  delete<T = unknown>(path: string, opts?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, opts);
  }

  private safeUrl(url: string): string {
    let out = url;
    for (const secret of this.redactValues) {
      if (secret) out = out.split(secret).join('[REDACTED]');
    }
    return out;
  }
}
