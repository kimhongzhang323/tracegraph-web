import type { VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    { source: '/api/(.*)', destination: '/api/index' },
    { source: '/((?!api/).*)', destination: '/index.html' },
  ],
  crons: [
    { path: '/api/cron/session-gc', schedule: '0 0 * * *' },
  ],
}
