import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updatePillarSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  targetAudience: z.string().optional(),
  keyThemes: z.array(z.string()).optional(),
  toneNotes: z.string().optional(),
  primaryKeywords: z.array(z.string()).optional(),
  priority: z.number().int().optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
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

export async function GET(
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

    const fullPillar = await prisma.pillar.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            matches: true,
            drafts: true,
          },
        },
      },
    })

    return NextResponse.json(fullPillar)
  } catch (error) {
    console.error('Error fetching pillar:', error)
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

    const pillar = await checkPillarAccess(params.id, session.user.id)
    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updatePillarSchema.parse(body)

    const updateData: any = { ...validated }

    // If name changed, update slug
    if (validated.name) {
      updateData.slug = validated.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const updated = await prisma.pillar.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating pillar:', error)
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

    const pillar = await checkPillarAccess(params.id, session.user.id)
    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 })
    }

    await prisma.pillar.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Pillar deleted' })
  } catch (error) {
    console.error('Error deleting pillar:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
