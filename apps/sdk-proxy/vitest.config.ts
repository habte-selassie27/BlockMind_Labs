import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Without this config vitest uses its default `**/*.{test,spec}.*` glob,
    // which does not match this package's `test_*.ts` filenames, so the suite
    // was reported as "No test files found" and never ran.
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/test_*.ts'],
    globals: true,
    environment: 'node',
  },
});
