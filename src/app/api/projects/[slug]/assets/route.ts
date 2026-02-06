import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlug } from '@/lib/project-access'
import { parsePageStructure } from '@/lib/utils/parse-page-structure'

export interface AssetItem {
  src: string
  alt?: string
  pageId: string
  pageTitle: string | null
  pageUrl: string
  pageSlug: string | null
}

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

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')?.trim() || ''
    const pageId = searchParams.get('pageId')?.trim() || ''
    const q = searchParams.get('q')?.trim() || ''
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const where: Prisma.PageWhereInput = {
      projectId: project.id,
    }

    if (pageId) {
      where.id = pageId
    }

    if (path) {
      const base = (project.baseUrl || '').replace(/\/+$/, '')
      const pathNorm = path.startsWith('/') ? path : `/${path}`
      const prefix = base ? `${base}${pathNorm}` : pathNorm
      where.OR = [
        { url: { startsWith: prefix, mode: 'insensitive' } },
        { url: { startsWith: `${prefix}/`, mode: 'insensitive' } },
      ]
    }

    const pages = await prisma.page.findMany({
      where,
      select: {
        id: true,
        slug: true,
        url: true,
        title: true,
        rawHtml: true,
      },
      orderBy: { crawledAt: 'desc' },
    })

    const allAssets: AssetItem[] = []

    for (const page of pages) {
      if (!page.rawHtml) continue
      const structure = parsePageStructure(page.rawHtml, page.url)
      for (const img of structure.images) {
        allAssets.push({
          src: img.src,
          alt: img.alt,
          pageId: page.id,
          pageTitle: page.title,
          pageUrl: page.url,
          pageSlug: page.slug,
        })
      }
    }

    let filtered = allAssets

    if (q) {
      const qLower = q.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.src.toLowerCase().includes(qLower) ||
          (a.alt?.toLowerCase().includes(qLower) ?? false)
      )
    }

    const total = filtered.length
    const assets = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      assets,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
