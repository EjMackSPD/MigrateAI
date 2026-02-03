import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlug } from '@/lib/project-access'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/utils/workflow'

const pillarSchema = z.object({
  projectId: z.string().uuid().optional(),
  projectSlug: z.string().min(1).optional(),
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
      where: { projectId: project.id },
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

    let project
    if (validated.projectSlug) {
      project = await getProjectBySlug(validated.projectSlug, session.user.id)
    } else if (validated.projectId) {
      project = await checkProjectAccess(validated.projectId, session.user.id)
    } else {
      return NextResponse.json({ error: 'projectId or projectSlug is required' }, { status: 400 })
    }
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate slug from name
    let baseSlug = validated.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    // Ensure slug is unique within the project
    let slug = baseSlug
    let counter = 1
    while (await prisma.pillar.findFirst({
      where: {
        projectId: project.id,
        slug: slug,
      },
    })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const pillar = await prisma.pillar.create({
      data: {
        projectId: project.id,
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

    // Update workflow stage to 'configure' if transitioning
    if (canTransitionTo(project.workflowStage as any, 'configure')) {
      await prisma.project.update({
        where: { id: project.id },
        data: { workflowStage: 'configure' },
      })
    }

    return NextResponse.json(pillar, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating pillar:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for unique constraint violation
      if (error.message.includes('Unique constraint') || error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'A pillar with this name already exists in this project' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
