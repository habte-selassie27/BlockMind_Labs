import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/test_*.ts'],
    globals: true,
    environment: 'node',
  },
});
