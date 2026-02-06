import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlug } from '@/lib/project-access'

export interface PathNode {
  path: string
  label: string
  pageCount: number
  children: PathNode[]
}

function addToTree(tree: Map<string, PathNode>, path: string, pageCount: number) {
  const segments = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const currentPath = i === 0 ? `/${seg}` : `/${segments.slice(0, i + 1).join('/')}`
    const parentPath = i === 0 ? '/' : `/${segments.slice(0, i).join('/')}`
    const parent = tree.get(parentPath)!
    let node = tree.get(currentPath)
    if (node) {
      node.pageCount += pageCount
    } else {
      node = { path: currentPath, label: seg, pageCount, children: [] }
      tree.set(currentPath, node)
      parent.children.push(node)
    }
  }
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

    const baseUrl = (project.baseUrl || '').replace(/\/+$/, '')
    const pages = await prisma.page.findMany({
      where: { projectId: project.id },
      select: { url: true },
    })

    const tree = new Map<string, PathNode>()
    tree.set('/', { path: '/', label: 'Site root', pageCount: 0, children: [] })

    const root = tree.get('/')!
    for (const p of pages) {
      let pathname: string
      try {
        const u = new URL(p.url)
        pathname = u.pathname || '/'
      } catch {
        pathname = '/'
      }
      root.pageCount++
      if (pathname && pathname !== '/') {
        addToTree(tree, pathname, 1)
      }
    }

    const rootNode = tree.get('/')!
    const sortChildren = (nodes: PathNode[]) => {
      nodes.sort((a, b) => a.label.localeCompare(b.label))
      nodes.forEach((n) => sortChildren(n.children))
    }
    sortChildren(rootNode.children)

    return NextResponse.json({
      paths: rootNode,
      baseUrl,
    })
  } catch (error) {
    console.error('Error fetching path tree:', error)
    return NextResponse.json(
      { error: 'Failed to fetch paths' },
      { status: 500 }
    )
  }
}
