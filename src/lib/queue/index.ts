import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

let connection: IORedis | null = null
let crawlQueue: Queue | null = null
let analysisQueue: Queue | null = null
let matchQueue: Queue | null = null
let generationQueue: Queue | null = null

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
      })

      // Set up error handlers
      connection.on('error', (err) => {
        console.error('Redis connection error:', err)
      })

      connection.on('connect', () => {
        console.log('Redis connected successfully')
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
  if (!crawlQueue) {
    crawlQueue = new Queue('crawl', { connection: getConnection() })
  }
  return crawlQueue
}

function getAnalysisQueue(): Queue {
  if (!analysisQueue) {
    analysisQueue = new Queue('analysis', { connection: getConnection() })
  }
  return analysisQueue
}

function getMatchQueue(): Queue {
  if (!matchQueue) {
    matchQueue = new Queue('match', { connection: getConnection() })
  }
  return matchQueue
}

function getGenerationQueue(): Queue {
  if (!generationQueue) {
    generationQueue = new Queue('generation', { connection: getConnection() })
  }
  return generationQueue
}

// Export queues - they will be initialized lazily when first accessed
export const crawlQueue = getCrawlQueue()
export const analysisQueue = getAnalysisQueue()
export const matchQueue = getMatchQueue()
export const generationQueue = getGenerationQueue()

// Export connection for workers
export function getQueueConnection(): IORedis {
  return getConnection()
}

// Initialize workers (these will be set up in separate worker files)
export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>
) {
  return new Worker(queueName, processor, { connection: getConnection() })
}
