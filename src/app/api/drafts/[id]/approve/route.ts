import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function checkDraftAccess(draftId: string, userId: string) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
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
  return draft
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

    const draft = await checkDraftAccess(params.id, session.user.id)
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const updated = await prisma.draft.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
