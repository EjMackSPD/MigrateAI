import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlug } from '@/lib/project-access'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await getProjectBySlug(params.slug, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const redirects = await prisma.pageRedirect.findMany({
      where: { projectId: project.id },
      include: {
        sourcePage: { select: { title: true } },
        targetPage: { select: { url: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const list = redirects.map((r) => ({
      id: r.id,
      sourceUrl: r.sourceUrl,
      sourceTitle: r.sourcePage?.title ?? null,
      targetType: r.targetType,
      targetUrl:
        r.targetType === 'page' && r.targetPage
          ? r.targetPage.url
          : r.targetUrl ?? (r.targetType === 'placeholder' ? '[Placeholder - update later]' : null),
      notes: r.notes,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ redirects: list })
  } catch (error) {
    console.error('Error fetching redirects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch redirects' },
      { status: 500 }
    )
  }
}
