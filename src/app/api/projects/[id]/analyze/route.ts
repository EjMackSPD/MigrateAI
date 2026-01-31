import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analysisQueue } from '@/lib/queue'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/utils/workflow'

const analyzeConfigSchema = z.object({
  pageIds: z.array(z.string().uuid()).optional(),
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
    const validated = analyzeConfigSchema.parse(body)

    // Check if required API keys are configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { 
          error: 'ANTHROPIC_API_KEY is not configured. Please add it to your .env.local file.',
          hint: 'See API_KEYS_SETUP.md for instructions on obtaining API keys.'
        },
        { status: 400 }
      )
    }

    if (!process.env.VOYAGE_API_KEY && !process.env.EMBEDDING_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'No embedding service API key configured. Please set VOYAGE_API_KEY or OPENAI_API_KEY in your .env.local file.',
          hint: 'See API_KEYS_SETUP.md for instructions on obtaining API keys.'
        },
        { status: 400 }
      )
    }

    // Update workflow stage to 'analyze' if transitioning
    if (canTransitionTo(project.workflowStage as any, 'analyze')) {
      await prisma.project.update({
        where: { id: params.id },
        data: { workflowStage: 'analyze' },
      })
    }

    // Create job record
    const job = await prisma.job.create({
      data: {
        projectId: params.id,
        jobType: 'analyze',
        status: 'pending',
        metadata: validated,
      },
    })

    // Queue analysis job
    await analysisQueue().add('analyze', {
      projectId: params.id,
      pageIds: validated.pageIds,
    }, {
      jobId: job.id,
    })

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Analysis job queued successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error starting analysis:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
