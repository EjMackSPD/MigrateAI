import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, withRetry } from '@/lib/db'

async function checkPageAccess(pageId: string, userId: string) {
  return prisma.page.findFirst({
    where: {
      id: pageId,
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    },
    include: {
      project: { select: { id: true } },
    },
  })
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

    const page = await checkPageAccess(params.id, session.user.id)
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    const body = await request.json()
    const { targetType, targetUrl, targetPageId, notes } = body

    if (!targetType || !['url', 'page', 'placeholder'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType. Use url, page, or placeholder.' },
        { status: 400 }
      )
    }

    let resolvedTargetUrl: string | null = null

    if (targetType === 'url') {
      const url = typeof targetUrl === 'string' ? targetUrl.trim() : ''
      if (!url) {
        return NextResponse.json(
          { error: 'Target URL is required when redirecting to URL.' },
          { status: 400 }
        )
      }
      resolvedTargetUrl = url
    } else if (targetType === 'page') {
      const targetId = typeof targetPageId === 'string' ? targetPageId.trim() : ''
      if (!targetId) {
        return NextResponse.json(
          { error: 'Target page is required when redirecting to another page.' },
          { status: 400 }
        )
      }
      const targetPage = await prisma.page.findFirst({
        where: {
          id: targetId,
          projectId: page.projectId,
        },
      })
      if (!targetPage) {
        return NextResponse.json(
          { error: 'Target page not found in this project.' },
          { status: 400 }
        )
      }
      resolvedTargetUrl = targetPage.url
    } else {
      resolvedTargetUrl = null
    }

    await withRetry(async () => {
      await prisma.$transaction([
        prisma.page.update({
          where: { id: params.id },
          data: { status: 'archived' },
        }),
        prisma.pageRedirect.upsert({
          where: { sourcePageId: params.id },
          create: {
            projectId: page.projectId,
            sourcePageId: params.id,
            sourceUrl: page.url,
            targetType,
            targetUrl: resolvedTargetUrl,
            targetPageId: targetType === 'page' ? targetPageId : null,
            notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
          },
          update: {
            targetType,
            targetUrl: resolvedTargetUrl,
            targetPageId: targetType === 'page' ? targetPageId : null,
            notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
          },
        }),
      ])
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error archiving page:', error)
    return NextResponse.json(
      { error: 'Failed to archive page' },
      { status: 500 }
    )
  }
}
