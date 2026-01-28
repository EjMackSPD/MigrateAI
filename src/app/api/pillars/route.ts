import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const pillarSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  targetAudience: z.string().optional(),
  keyThemes: z.array(z.string()).optional(),
  toneNotes: z.string().optional(),
  primaryKeywords: z.array(z.string()).optional(),
  priority: z.number().int().default(0),
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const project = await checkProjectAccess(projectId, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const pillars = await prisma.pillar.findMany({
      where: { projectId },
      include: {
        _count: {
          select: {
            matches: true,
            drafts: true,
          },
        },
      },
      orderBy: {
        priority: 'desc',
      },
    })

    return NextResponse.json(pillars)
  } catch (error) {
    console.error('Error fetching pillars:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = pillarSchema.parse(body)

    const project = await checkProjectAccess(validated.projectId, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate slug from name
    const slug = validated.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const pillar = await prisma.pillar.create({
      data: {
        projectId: validated.projectId,
        name: validated.name,
        slug,
        description: validated.description,
        targetAudience: validated.targetAudience || null,
        keyThemes: validated.keyThemes || [],
        toneNotes: validated.toneNotes || null,
        primaryKeywords: validated.primaryKeywords || [],
        priority: validated.priority,
      },
    })

    return NextResponse.json(pillar, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating pillar:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
