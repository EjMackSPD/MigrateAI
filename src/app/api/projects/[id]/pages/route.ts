import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
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
            },
          },
        },
      ],
    },
  })
  return project
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

    const project = await checkProjectAccess(params.id, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const q = searchParams.get('q')?.trim() || ''
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const where: Record<string, unknown> = {
      projectId: params.id,
    }

    if (status) {
      where.status = status
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { url: { contains: q, mode: 'insensitive' } },
      ]
    }

    const pages = await prisma.page.findMany({
      where: where as Prisma.PageWhereInput,
      select: {
        id: true,
        url: true,
        title: true,
        status: true,
        wordCount: true,
        qualityScore: true,
        detectedTopics: true,
        crawledAt: true,
        analyzedAt: true,
      },
      orderBy: {
        crawledAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const total = await prisma.page.count({ where: where as Prisma.PageWhereInput })

    return NextResponse.json({
      pages,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching pages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
