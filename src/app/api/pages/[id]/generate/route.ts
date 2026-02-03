import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generationQueue } from '@/lib/queue'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/utils/workflow'

const generateSchema = z.object({
  contentType: z.enum([
    'pillar_page',
    'supporting_article',
    'faq_page',
    'glossary',
    'comparison',
  ]),
  pillarId: z.string().uuid().optional(),
})

async function checkPageAccess(pageId: string, userId: string) {
  return prisma.page.findFirst({
    where: {
      id: pageId,
      project: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId: userId },
            },
          },
        ],
      },
    },
    include: {
      project: {
        select: {
          id: true,
          workflowStage: true,
        },
      },
    },
  })
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

    const page = await checkPageAccess(params.id, session.user.id)
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'ANTHROPIC_API_KEY is not configured. Add it to .env.local',
          hint: 'See API_KEYS_SETUP.md',
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { contentType, pillarId } = generateSchema.parse(body)
    const projectId = page.project!.id

    let pillar

    if (pillarId) {
      pillar = await prisma.pillar.findFirst({
        where: {
          id: pillarId,
          projectId,
        },
      })
      if (!pillar) {
        return NextResponse.json({ error: 'Pillar not found' }, { status: 404 })
      }
    } else {
      const name = page.title || 'New Pillar'
      let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pillar'
      let slug = baseSlug
      let counter = 1
      while (
        await prisma.pillar.findFirst({
          where: { projectId, slug },
        })
      ) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      pillar = await prisma.pillar.create({
        data: {
          projectId,
          name,
          slug,
          description: `Content generated from page: ${page.url}`,
        },
      })

      if (
        page.project &&
        canTransitionTo(page.project.workflowStage as any, 'configure')
      ) {
        await prisma.project.update({
          where: { id: projectId },
          data: { workflowStage: 'configure' },
        })
      }
    }

    if (
      page.project &&
      canTransitionTo(page.project.workflowStage as any, 'generate')
    ) {
      await prisma.project.update({
        where: { id: projectId },
        data: { workflowStage: 'generate' },
      })
    }

    const job = await prisma.job.create({
      data: {
        projectId,
        jobType: 'generate',
        status: 'pending',
        metadata: {
          contentType,
          sourcePageIds: [params.id],
          titleSuggestion: page.title || undefined,
        },
      },
    })

    await generationQueue().add(
      'generate',
      {
        pillarId: pillar.id,
        config: {
          contentType,
          sourcePageIds: [params.id],
          titleSuggestion: page.title || undefined,
        },
      },
      { jobId: job.id }
    )

    return NextResponse.json({
      jobId: job.id,
      pillarId: pillar.id,
      status: 'pending',
      message: 'Generation queued',
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
        error: 'Failed to start generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
