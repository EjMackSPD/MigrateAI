import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlug } from '@/lib/project-access'

const clearBodySchema = z.object({
  scope: z.enum(['pages', 'pillars', 'jobs', 'all']),
})

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await getProjectBySlug(params.slug, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { scope } = clearBodySchema.parse(body)

    const projectId = project.id

    if (scope === 'pages' || scope === 'all') {
      await prisma.match.deleteMany({
        where: { page: { projectId } },
      })
      await prisma.page.deleteMany({
        where: { projectId },
      })
    }

    if (scope === 'pillars' || scope === 'all') {
      await prisma.draft.deleteMany({
        where: { pillar: { projectId } },
      })
      await prisma.match.deleteMany({
        where: { pillar: { projectId } },
      })
      await prisma.pillar.deleteMany({
        where: { projectId },
      })
    }

    if (scope === 'jobs' || scope === 'all') {
      await prisma.job.deleteMany({
        where: { projectId },
      })
    }

    if (scope === 'all') {
      await prisma.project.update({
        where: { id: projectId },
        data: { workflowStage: 'not_started' },
      })
    }

    return NextResponse.json({
      success: true,
      scope,
      message: `Cleared ${scope} for project.`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid scope', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Error clearing project records:', error)
    return NextResponse.json(
      { error: 'Failed to clear records' },
      { status: 500 }
    )
  }
}
