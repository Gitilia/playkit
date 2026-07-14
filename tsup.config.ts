import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'browser/index': 'src/browser/index.ts',
    'api/index': 'src/api/index.ts',
    'mail/index': 'src/mail/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['@playwright/test'],
});
