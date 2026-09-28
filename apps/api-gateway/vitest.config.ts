import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test files here are named test_*.ts, which the previous
    // `tests/**/*.test.ts` glob did not match — vitest found 0 files and the
    // whole suite was silently skipped.
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/test_*.ts'],
    globals: true,
    environment: 'node',
  },
});
