import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CrawlerService } from '@/lib/services/crawler'
import { withRetry } from '@/lib/db'

async function checkPageAccess(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
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
    include: {
      project: {
        select: {
          id: true,
          name: true,
          baseUrl: true,
        },
      },
      matches: {
        include: {
          pillar: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          relevanceScore: 'desc',
        },
      },
    },
  })
  return page
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

    const page = await checkPageAccess(params.id, session.user.id)
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('Error fetching page:', error)
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

    const page = await checkPageAccess(params.id, session.user.id)
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    await withRetry(() =>
      prisma.match.deleteMany({
        where: { pageId: params.id },
      })
    )
    await withRetry(() =>
      prisma.page.delete({
        where: { id: params.id },
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting page:', error)
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    )
  }
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

    const crawler = new CrawlerService()
    try {
      await crawler.initialize()
      const config = { baseUrl: page.project?.baseUrl || page.url }
      const crawled = await crawler.crawlPage(page.url, config)
      await crawler.close()

      await withRetry(() =>
        prisma.page.update({
          where: { id: params.id },
          data: {
            url: crawled.url,
            urlHash: crawled.urlHash,
            title: crawled.title,
            metaDescription: crawled.metaDescription,
            rawHtml: crawled.rawHtml,
            extractedContent: crawled.extractedContent,
            wordCount: crawled.wordCount,
            contentType: crawled.contentType,
            crawlDepth: crawled.crawlDepth,
            status: 'crawled',
            crawledAt: new Date(),
          },
        })
      )

      const updated = await prisma.page.findUnique({
        where: { id: params.id },
        include: {
          project: { select: { id: true, name: true } },
          matches: { include: { pillar: { select: { id: true, name: true } } } },
        },
      })
      return NextResponse.json(updated)
    } finally {
      await crawler.close().catch(() => {})
    }
  } catch (error) {
    console.error('Error rescanning page:', error)
    const message = error instanceof Error ? error.message : 'Failed to rescan page'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
