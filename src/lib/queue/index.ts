import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required')
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    if (times > 3) {
      return null // Stop retrying after 3 attempts
    }
    return Math.min(times * 200, 2000)
  }
})

export const crawlQueue = new Queue('crawl', { connection })
export const analysisQueue = new Queue('analysis', { connection })
export const matchQueue = new Queue('match', { connection })
export const generationQueue = new Queue('generation', { connection })

// Initialize workers (these will be set up in separate worker files)
export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>
) {
  return new Worker(queueName, processor, { connection })
}
