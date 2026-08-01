import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

const { SUPABASE_SERVICE_ROLE_KEY } = loadEnv('', process.cwd(), '')

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    env: { SUPABASE_SERVICE_ROLE_KEY },
    // NOTE: Integration (.integration.test.*) and API (.api.test.*) tests are
    // excluded via CLI --exclude flags in package.json scripts, NOT here.
    // A config-level exclude would also block the filtered runs
    // (test:integration / test:api) because Vitest applies `exclude` during
    // discovery, before CLI filters narrow the file set.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
