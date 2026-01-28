import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    const matches = await prisma.match.findMany({
      where: { pillarId: params.id },
      include: {
        page: {
          select: {
            id: true,
            url: true,
            title: true,
            wordCount: true,
            contentType: true,
            qualityScore: true,
          },
        },
      },
      orderBy: {
        relevanceScore: 'desc',
      },
    })

    const selectedCount = matches.filter((m) => m.isSelected).length
    const excludedCount = matches.filter((m) => m.isExcluded).length

    return NextResponse.json({
      pillarId: params.id,
      matches,
      total: matches.length,
      selectedCount,
      excludedCount,
    })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
