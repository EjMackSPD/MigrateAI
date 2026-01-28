import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pillarId = searchParams.get('pillarId')

    if (!pillarId) {
      return NextResponse.json(
        { error: 'pillarId is required' },
        { status: 400 }
      )
    }

    // Check access
    const pillar = await prisma.pillar.findFirst({
      where: {
        id: pillarId,
        project: {
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
      },
    })

    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 })
    }

    const drafts = await prisma.draft.findMany({
      where: { pillarId },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(drafts)
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
