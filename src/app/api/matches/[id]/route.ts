import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateMatchSchema = z.object({
  isSelected: z.boolean().optional(),
  isExcluded: z.boolean().optional(),
})

async function checkMatchAccess(matchId: string, userId: string) {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      pillar: {
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
    },
  })
  return match
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

    const match = await checkMatchAccess(params.id, session.user.id)
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateMatchSchema.parse(body)

    const updateData: any = {}
    if (validated.isSelected !== undefined) {
      updateData.isSelected = validated.isSelected
      updateData.selectedAt = validated.isSelected ? new Date() : null
    }
    if (validated.isExcluded !== undefined) {
      updateData.isExcluded = validated.isExcluded
    }

    const updated = await prisma.match.update({
      where: { id: params.id },
      data: updateData,
      include: {
        page: {
          select: {
            id: true,
            url: true,
            title: true,
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

    console.error('Error updating match:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
