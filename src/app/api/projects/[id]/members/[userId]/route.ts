import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
              role: { in: ['owner', 'admin'] },
            },
          },
        },
      ],
    },
  })
  return project
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
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

    // Don't allow removing the owner
    if (project.ownerId === params.userId) {
      return NextResponse.json(
        { error: 'Cannot remove project owner' },
        { status: 400 }
      )
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId: params.userId,
        },
      },
    })

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; userId: string } }
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

    const body = await request.json()
    const { role } = body

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const member = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId: params.id,
          userId: params.userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
