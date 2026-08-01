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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
