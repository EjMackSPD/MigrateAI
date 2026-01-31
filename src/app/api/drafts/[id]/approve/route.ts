import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canTransitionTo } from '@/lib/utils/workflow'

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

    // Get the project to update workflow stage
    const pillar = await prisma.pillar.findUnique({
      where: { id: draft.pillarId },
      select: { projectId: true },
    })

    const updated = await prisma.draft.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedById: session.user.id,
      },
    })

    // Update workflow stage to 'review' if transitioning
    if (pillar) {
      const project = await prisma.project.findUnique({
        where: { id: pillar.projectId },
      })
      if (project && canTransitionTo(project.workflowStage as any, 'review')) {
        await prisma.project.update({
          where: { id: pillar.projectId },
          data: { workflowStage: 'review' },
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
