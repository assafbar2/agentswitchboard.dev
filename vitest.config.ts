import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Catalog-wide checks walk every listing and task; on shared CI runners one takes several seconds.
    testTimeout: 15_000,
  },
});
