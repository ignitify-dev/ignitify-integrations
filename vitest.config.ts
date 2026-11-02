import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The two shared packages resolve to SOURCE in tests, so a test never needs a prior build.
// Item packages resolve through their package.json like any consumer would.
export default defineConfig({
  resolve: {
    alias: {
      '@ignitify-integrations/runtime': src('./runtime/src/index.ts'),
      '@ignitify-integrations/core': src('./core/src/index.ts'),
    },
  },
  test: {
    include: ['**/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30_000,
  },
});
