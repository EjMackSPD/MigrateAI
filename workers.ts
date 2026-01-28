// Background job workers
// Run this file to start processing background jobs
// Requires: Redis to be running

import { config } from 'dotenv'
import { resolve } from 'path'
import { register } from 'tsconfig-paths'

// Load .env.local FIRST, before any other imports
const envPath = resolve(__dirname, '.env.local')
config({ path: envPath })

// Verify Redis URL is loaded
if (!process.env.REDIS_URL) {
  console.error('❌ ERROR: REDIS_URL not found in .env.local')
  console.error('   Please check your .env.local file')
  process.exit(1)
}

console.log('✅ Redis URL loaded:', process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@'))

// Register path aliases
register({
  baseUrl: '.',
  paths: {
    '@/*': ['src/*']
  }
})

// Import workers - these will start automatically when imported
import './src/lib/queue/crawl-worker'
import './src/lib/queue/analysis-worker'
import './src/lib/queue/match-worker'
import './src/lib/queue/generation-worker'

console.log('🚀 Starting background workers...')
console.log('✅ Workers started for: crawl, analysis, match, generation')
console.log('📊 Listening for jobs...')
console.log('Press Ctrl+C to stop\n')

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down workers...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down workers...')
  process.exit(0)
})
