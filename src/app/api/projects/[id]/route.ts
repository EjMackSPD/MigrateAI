import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/utils/url-validator'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  baseUrl: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  settings: z.record(z.any()).optional(),
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

export async function GET(
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

    const fullProject = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            pages: true,
            pillars: true,
            jobs: true,
          },
        },
      },
    })

    // Get stats
    const stats = {
      pagesCrawled: await prisma.page.count({
        where: { projectId: params.id },
      }),
      pagesAnalyzed: await prisma.page.count({
        where: { projectId: params.id, status: 'analyzed' },
      }),
      pillarsCount: await prisma.pillar.count({
        where: { projectId: params.id },
      }),
      draftsCount: await prisma.draft.count({
        where: {
          pillar: {
            projectId: params.id,
          },
        },
      }),
      draftsApproved: await prisma.draft.count({
        where: {
          pillar: {
            projectId: params.id,
          },
          status: 'approved',
        },
      }),
    }

    return NextResponse.json({ ...fullProject, stats })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Check if user is owner or admin
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId: session.user.id,
        },
      },
    })

    if (project.ownerId !== session.user.id && member?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateProjectSchema.parse(body)

    // Validate URL if provided
    if (validated.baseUrl) {
      const urlValidation = validateUrl(validated.baseUrl)
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: urlValidation.error || 'Invalid URL' },
          { status: 400 }
        )
      }
      // Use normalized URL
      validated.baseUrl = urlValidation.normalizedUrl || validated.baseUrl
    }

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: validated,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Project deleted' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
