import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { assertSchema, SchemaAssertionError } from './schema.js';

describe('assertSchema', () => {
  const Health = z.object({ status: z.literal('ok') });

  it('returns parsed data when valid', () => {
    expect(assertSchema({ status: 'ok' }, Health)).toEqual({ status: 'ok' });
  });

  it('throws SchemaAssertionError when invalid', () => {
    expect(() => assertSchema({ status: 'nope' }, Health, 'health')).toThrow(
      SchemaAssertionError,
    );
  });
});
