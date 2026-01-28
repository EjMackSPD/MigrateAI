import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generationQueue } from '@/lib/queue'
import { z } from 'zod'

const generateConfigSchema = z.object({
  contentType: z.enum([
    'pillar_page',
    'supporting_article',
    'faq_page',
    'glossary',
    'comparison',
  ]),
  titleSuggestion: z.string().optional(),
  additionalGuidance: z.string().optional(),
  sourcePageIds: z.array(z.string().uuid()).min(1),
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
    const validated = generateConfigSchema.parse(body)

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

    // Create job record
    const job = await prisma.job.create({
      data: {
        projectId: pillar.projectId,
        jobType: 'generate',
        status: 'pending',
        metadata: validated,
      },
    })

    // Queue generation job
    await generationQueue.add(
      'generate',
      {
        pillarId: params.id,
        config: validated,
      },
      {
        jobId: job.id,
      }
    )

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Generation job queued successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error starting generation:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
