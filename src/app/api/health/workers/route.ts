import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import IORedis from 'ioredis'
import { Queue } from 'bullmq'

/**
 * GET /api/health/workers
 * Returns worker/queue health status for Redis and BullMQ queues.
 * Uses a dedicated Redis connection for the health check (avoids the queue module's
 * enableOfflineQueue: false which throws "Stream isn't writeable" when not ready).
 * Requires authentication.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      redis: 'connected' | 'disconnected' | 'not_configured' | 'error'
      queues: 'ok' | 'error' | 'n/a'
      queuesDetail?: Record<string, { waiting: number; active: number; completed: number; failed: number }>
      message?: string
    } = {
      status: 'unhealthy',
      redis: 'not_configured',
      queues: 'n/a',
    }

    if (!process.env.REDIS_URL?.trim()) {
      result.message = 'REDIS_URL not set in .env.local. Workers cannot run without Redis.'
      return NextResponse.json(result)
    }

    // Use a dedicated connection for health check - enableOfflineQueue: true
    // allows commands while connecting (queue module uses false, which throws)
    const healthRedis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: true,
      retryStrategy: () => null,
    })

    try {
      await healthRedis.ping()
      result.redis = 'connected'

      // Use same connection for queue checks (BullMQ stores in Redis)
      const queueNames = ['crawl', 'analysis', 'match', 'generation'] as const
      const queuesDetail: Record<string, { waiting: number; active: number; completed: number; failed: number }> = {}

      for (const name of queueNames) {
        try {
          const queue = new Queue(name, { connection: healthRedis, skipVersionCheck: true })
          const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed')
          queuesDetail[name] = {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
          }
        } catch {
          queuesDetail[name] = { waiting: 0, active: 0, completed: 0, failed: -1 }
        }
      }

      result.queuesDetail = queuesDetail
      result.queues = 'ok'
      result.status = 'healthy'
      result.message = 'Redis connected, queues reachable. Run "npm run workers" in a separate terminal to process jobs.'
    } catch (err) {
      result.redis = result.redis === 'connected' ? 'connected' : 'error'
      result.queues = 'error'
      result.status = 'unhealthy'
      result.message = err instanceof Error ? err.message : 'Failed to connect to Redis or queues'
    } finally {
      healthRedis.disconnect()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        redis: 'error',
        queues: 'n/a',
        message: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 500 }
    )
  }
}
