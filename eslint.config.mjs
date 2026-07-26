// Flat ESLint config — lint the library source (`npx eslint src`).
// Typecheck stays separate (`npm run typecheck`); this catches what tsc doesn't.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/', 'selftest/demo-site/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        // Browser globals for code evaluated inside the page (persistentSession, richText).
        ...globals.browser,
      },
    },
    rules: {
      // The kit wraps Playwright objects whose shapes we don't own; `any` is
      // still banned by default — allow unused args prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
);
