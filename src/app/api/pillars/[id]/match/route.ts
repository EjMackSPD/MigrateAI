import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { matchQueue } from '@/lib/queue'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/utils/workflow'

const matchConfigSchema = z.object({
  minRelevance: z.number().min(0).max(1).optional(),
  maxResults: z.number().min(1).max(1000).optional(),
  includePreviouslyMatched: z.boolean().optional(),
})

async function checkPillarAccess(pillarId: string, userId: string) {
  const pillar = await prisma.pillar.findFirst({
    where: {
      id: pillarId,
      project: {
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
    },
  })
  return pillar
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

    const pillar = await checkPillarAccess(params.id, session.user.id)
    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = matchConfigSchema.parse(body)

    // Get project to check workflow stage
    const project = await prisma.project.findUnique({
      where: { id: pillar.projectId },
    })

    // Update workflow stage to 'match' if transitioning
    if (project && canTransitionTo(project.workflowStage as any, 'match')) {
      await prisma.project.update({
        where: { id: pillar.projectId },
        data: { workflowStage: 'match' },
      })
    }

    // Create job record
    const job = await prisma.job.create({
      data: {
        projectId: pillar.projectId,
        jobType: 'match',
        status: 'pending',
        metadata: validated,
      },
    })

    // Queue match job
    await matchQueue().add('match', {
      pillarId: params.id,
      config: validated,
    }, {
      jobId: job.id,
    })

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Matching job queued successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error starting match:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
