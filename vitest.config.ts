import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest owns test/ui only. Its default include pattern would also collect the node:test files
// under test/*.test.mjs (including the *-integration.test.mjs files that call paid providers), so
// include is limited and everything else is excluded explicitly.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/ui/**/*.test.{ts,tsx}'],
    exclude: ['test/*.test.mjs', 'test/e2e/**', 'node_modules/**', 'dashboard/dist/**'],
    environment: 'jsdom',
    setupFiles: ['test/ui/setup.ts'],
    globals: true,
    testTimeout: 20_000,
  },
});
