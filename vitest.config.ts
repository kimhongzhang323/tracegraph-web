import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // In node env (used by api.test.ts) relative URLs are invalid — use localhost.
  // Component/hook tests run in jsdom where window.location provides the base.
  define: { 'import.meta.env.VITE_API_BASE_URL': '"http://localhost"' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/components/**'],
      exclude: ['src/test/**', 'src/data/**', 'src/pages/**'],
      thresholds: { lines: 45, functions: 45 },
    },
  },
})
