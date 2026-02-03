import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CrawlerService } from '@/lib/services/crawler'
import { withRetry } from '@/lib/db'
import { slugify } from '@/lib/utils/slugify'

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

const contentUpdateSchema = {
  structuredContent: (v: unknown) =>
    typeof v === 'string' ? v : undefined,
  extractedContent: (v: unknown) =>
    typeof v === 'string' ? v : undefined,
}

/** Strip markdown to plain text for extractedContent */
function markdownToPlainText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function PATCH(
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
    const structuredContent = contentUpdateSchema.structuredContent(body.structuredContent)
    const extractedContent = contentUpdateSchema.extractedContent(body.extractedContent)

    if (structuredContent === undefined && extractedContent === undefined) {
      return NextResponse.json(
        { error: 'Provide structuredContent and/or extractedContent' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (structuredContent !== undefined) {
      data.structuredContent = structuredContent
      data.extractedContent =
        extractedContent ?? markdownToPlainText(structuredContent)
      data.wordCount = data.extractedContent
        ? (data.extractedContent as string).split(/\s+/).filter(Boolean).length
        : 0
    } else if (extractedContent !== undefined) {
      data.extractedContent = extractedContent
      data.wordCount = extractedContent.split(/\s+/).filter(Boolean).length
    }

    const updated = await withRetry(() =>
      prisma.page.update({
        where: { id: params.id },
        data,
      })
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating page content:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
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
            structuredContent: crawled.structuredContent,
            wordCount: crawled.wordCount,
            contentType: crawled.contentType,
            crawlDepth: crawled.crawlDepth,
            status: 'crawled',
            crawledAt: new Date(),
          },
        })
      )

      if (page.slug == null || page.slug === '') {
        const baseSlug = (() => {
          const fromTitle = slugify(crawled.title || '')
          if (fromTitle && fromTitle !== 'project') return fromTitle.slice(0, 180)
          try {
            const path = new URL(crawled.url).pathname
            return slugify(path.replace(/^\//, '').replace(/\/$/, '') || 'page').slice(0, 180)
          } catch {
            return 'page'
          }
        })()
        let pageSlug = baseSlug
        let n = 0
        while (
          await prisma.page.findFirst({
            where: {
              projectId: page.project!.id,
              slug: pageSlug,
              id: { not: params.id },
            },
          })
        ) {
          n++
          pageSlug = `${baseSlug}-${n}`
        }
        await withRetry(() =>
          prisma.page.update({
            where: { id: params.id },
            data: { slug: pageSlug },
          })
        )
      }

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
