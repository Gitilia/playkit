import type { z } from 'zod';

export class SchemaAssertionError extends Error {
  constructor(
    message: string,
    readonly issues: unknown,
  ) {
    super(message);
    this.name = 'SchemaAssertionError';
  }
}

/**
 * Assert `data` matches a Zod schema. Throws SchemaAssertionError on failure.
 * Prefer this over `as T` casts at API boundaries.
 */
export function assertSchema<T>(
  data: unknown,
  schema: z.ZodType<T>,
  label = 'response',
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const summary = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new SchemaAssertionError(
      `Schema assertion failed for ${label}: ${summary}`,
      result.error.issues,
    );
  }
  return result.data;
}
