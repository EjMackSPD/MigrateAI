import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { validateUrl } from '@/lib/utils/url-validator'
import { z } from 'zod'

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  clientName: z.string().min(1, 'Client name is required'),
  baseUrl: z.string().min(1, 'Base URL is required'),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get projects where user is owner or member
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            pages: true,
            pillars: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
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
    const validated = projectSchema.parse(body)

    // Validate URL
    const urlValidation = validateUrl(validated.baseUrl)
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid URL' },
        { status: 400 }
      )
    }

    // Use normalized URL
    const normalizedUrl = urlValidation.normalizedUrl || validated.baseUrl

    const project = await prisma.project.create({
      data: {
        name: validated.name,
        clientName: validated.clientName,
        baseUrl: normalizedUrl,
        description: validated.description || null,
        settings: validated.settings || {},
        ownerId: session.user.id,
      },
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

    // Add owner as project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        role: 'owner',
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
