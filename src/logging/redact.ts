const SENSITIVE_KEY =
  /(pass(word)?|secret|token|authorization|api[_-]?key|cookie|set-cookie)/i;

/**
 * Deep-redact common secret fields for safe logs.
 */
export function redactSecrets<T>(value: T, depth = 0): T {
  if (depth > 8) return value;
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => redactSecrets(v, depth + 1)) as T;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = typeof v === 'string' && v.length > 0 ? '[REDACTED]' : v;
      } else {
        out[k] = redactSecrets(v, depth + 1);
      }
    }
    return out as T;
  }

  if (typeof value === 'string') {
    // Bearer tokens in free text
    return value.replace(/(Bearer\s+)[A-Za-z0-9._\-+=/]+/gi, '$1[REDACTED]') as T;
  }

  return value;
}
