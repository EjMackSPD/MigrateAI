import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

let connection: IORedis | null = null
let _crawlQueue: Queue | null = null
let _analysisQueue: Queue | null = null
let _matchQueue: Queue | null = null
let _generationQueue: Queue | null = null

function getConnection(): IORedis {
  if (!connection) {
    if (!process.env.REDIS_URL) {
      throw new Error(
        'REDIS_URL environment variable is required. Please set it in your .env.local file.'
      )
    }

    try {
      connection = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy: (times) => {
          if (times > 3) {
            return null // Stop retrying after 3 attempts
          }
          return Math.min(times * 200, 2000)
        },
        lazyConnect: true,
        // Suppress eviction policy warning for now (Redis Cloud uses volatile-lru by default)
        // In production, configure Redis with "noeviction" policy
        enableOfflineQueue: false,
      })

      // Set up error handlers
      connection.on('error', (err) => {
        console.error('Redis connection error:', err)
      })

      connection.on('connect', () => {
        console.log('Redis connected successfully')
      })

      connection.on('ready', () => {
        console.log('Redis connection ready')
      })

      connection.on('close', () => {
        console.log('Redis connection closed')
      })
    } catch (error) {
      throw new Error(
        `Failed to initialize Redis connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
  return connection
}

function getCrawlQueue(): Queue {
  if (!_crawlQueue) {
    _crawlQueue = new Queue('crawl', { connection: getConnection() })
  }
  return _crawlQueue
}

function getAnalysisQueue(): Queue {
  if (!_analysisQueue) {
    _analysisQueue = new Queue('analysis', { connection: getConnection() })
  }
  return _analysisQueue
}

function getMatchQueue(): Queue {
  if (!_matchQueue) {
    _matchQueue = new Queue('match', { connection: getConnection() })
  }
  return _matchQueue
}

function getGenerationQueue(): Queue {
  if (!_generationQueue) {
    _generationQueue = new Queue('generation', { connection: getConnection() })
  }
  return _generationQueue
}

// Queues are created lazily when getCrawlQueue() etc. are first called.
// API routes should call these inside try/catch so missing REDIS_URL doesn't crash the server on import.
export const crawlQueue = getCrawlQueue
export const analysisQueue = getAnalysisQueue
export const matchQueue = getMatchQueue
export const generationQueue = getGenerationQueue

// Export connection for workers
export function getQueueConnection(): IORedis {
  return getConnection()
}

// Initialize workers (these will be set up in separate worker files)
export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>
) {
  const connection = getConnection()
  const worker = new Worker(queueName, processor, { 
    connection,
    concurrency: 1, // Process one job at a time
  })

  // Add event listeners for debugging
  worker.on('completed', (job) => {
    console.log(`Worker [${queueName}]: Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Worker [${queueName}]: Job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error(`Worker [${queueName}]: Error:`, err)
  })

  worker.on('active', (job) => {
    console.log(`🔄 Worker [${queueName}]: Job ${job.id} is now active`)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`Worker [${queueName}]: Job ${jobId} stalled`)
  })

  console.log(`Worker [${queueName}] initialized and listening for jobs`)

  return worker
}
