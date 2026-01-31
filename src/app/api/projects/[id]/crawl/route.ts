import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { crawlQueue } from '@/lib/queue'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/utils/workflow'
import { validateUrl } from '@/lib/utils/url-validator'

const crawlConfigSchema = z.object({
  maxPages: z.number().min(1).max(10000).optional(),
  maxDepth: z.number().min(1).max(10).optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  respectRobots: z.boolean().optional(),
  rateLimitMs: z.number().min(0).optional(),
})

async function checkProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
  })
  return project
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await checkProjectAccess(params.id, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.baseUrl?.trim()) {
      return NextResponse.json(
        { error: 'Project has no website URL configured. Edit the project and set a valid base URL.' },
        { status: 400 }
      )
    }
    const urlCheck = validateUrl(project.baseUrl)
    if (!urlCheck.valid) {
      return NextResponse.json(
        { error: urlCheck.error || 'Project base URL is invalid. Edit the project and set a valid URL.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validated = crawlConfigSchema.parse(body)

    // Update workflow stage to 'ingest' if transitioning
    if (canTransitionTo(project.workflowStage as any, 'ingest')) {
      await prisma.project.update({
        where: { id: params.id },
        data: { workflowStage: 'ingest' },
      })
    }

    // Create job record
    const job = await prisma.job.create({
      data: {
        projectId: params.id,
        jobType: 'crawl',
        status: 'pending',
        metadata: {
          config: validated,
          baseUrl: project.baseUrl,
        },
      },
    })

    // Add base URL to config
    const config = {
      ...validated,
      baseUrl: project.baseUrl,
    }

    // Queue crawl job (get queue lazily so missing REDIS_URL doesn't crash on import)
    try {
      const queue = crawlQueue()
      console.log(`📤 Queuing crawl job ${job.id} for project ${params.id}`)
      const queuedJob = await queue.add('crawl', {
        projectId: params.id,
        config,
      }, {
        jobId: job.id,
      })
      console.log(`Crawl job ${job.id} queued successfully. BullMQ job ID: ${queuedJob.id}`)
    } catch (queueError) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: queueError instanceof Error ? queueError.message : 'Failed to queue job',
          completedAt: new Date(),
        },
      })
      const msg = queueError instanceof Error ? queueError.message : 'Unknown error'
      const isRedis = /REDIS_URL|redis|ECONNREFUSED|connect/i.test(msg)
      console.error('Error queuing crawl job:', queueError)
      return NextResponse.json(
        {
          error: isRedis
            ? 'Crawl queue is unavailable. Start Redis (e.g. docker run -p 6379:6379 redis) and set REDIS_URL in .env.local. Then run workers in a separate terminal: npm run workers'
            : `Failed to queue crawl job: ${msg}`,
          details: msg,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Crawl job queued successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error starting crawl:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
