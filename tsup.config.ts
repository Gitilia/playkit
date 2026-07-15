import { defineConfig } from 'tsup';

const shared = {
  dts: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['@playwright/test'],
} as const;

export default defineConfig([
  {
    ...shared,
    entry: {
      index: 'src/index.ts',
      'browser/index': 'src/browser/index.ts',
      'api/index': 'src/api/index.ts',
      'mail/index': 'src/mail/index.ts',
    },
    format: ['esm', 'cjs'],
    clean: true,
  },
  {
    ...shared,
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: false,
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
