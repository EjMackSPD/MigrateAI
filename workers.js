// Background job workers
// Run this file to start processing background jobs
// Requires: Redis to be running

require('dotenv').config({ path: '.env.local' })

// Import workers
const { crawlWorker } = require('./src/lib/queue/crawl-worker')
const { analysisWorker } = require('./src/lib/queue/analysis-worker')
const { matchWorker } = require('./src/lib/queue/match-worker')
const { generationWorker } = require('./src/lib/queue/generation-worker')

console.log('🚀 Starting background workers...')
console.log('Workers started for: crawl, analysis, match, generation')
console.log('Press Ctrl+C to stop')

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down workers...')
  process.exit(0)
})
