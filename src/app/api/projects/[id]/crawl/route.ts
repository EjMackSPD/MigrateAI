import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { crawlQueue } from '@/lib/queue'
import { z } from 'zod'

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

    const body = await request.json()
    const validated = crawlConfigSchema.parse(body)

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

    // Queue crawl job
    await crawlQueue.add('crawl', {
      projectId: params.id,
      config,
    }, {
      jobId: job.id,
    })

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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
