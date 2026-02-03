import { prisma } from '@/lib/db'
import type { Project } from '@prisma/client'

/** Reject invalid slugs (e.g. "undefined") */
function isValidSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.length > 0 && slug !== 'undefined'
}

/**
 * Get project id by slug with access check. Uses raw SQL to support slug
 * when Prisma client may not have been regenerated.
 */
async function getProjectIdBySlug(
  slug: string,
  userId: string,
  requireAdmin: boolean
): Promise<string | null> {
  if (!isValidSlug(slug)) return null
  if (requireAdmin) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}
      WHERE p.slug = ${slug}
        AND (p.owner_id = ${userId} OR (pm.user_id IS NOT NULL AND pm.role IN ('owner', 'admin')))
    `
    return rows[0]?.id ?? null
  }
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}
    WHERE p.slug = ${slug}
      AND (p.owner_id = ${userId} OR pm.user_id IS NOT NULL)
  `
  return rows[0]?.id ?? null
}

/**
 * Get a project by slug and verify the user has access.
 * Returns the project (with id) or null if not found / no access.
 */
export async function getProjectBySlug(
  slug: string,
  userId: string
): Promise<Project | null> {
  const id = await getProjectIdBySlug(slug, userId, false)
  if (!id) return null
  return prisma.project.findUnique({ where: { id } })
}

/**
 * Get a full project by slug (with relations) for page rendering.
 */
export async function getProjectBySlugWithDetails(slug: string, userId: string) {
  const id = await getProjectIdBySlug(slug, userId, false)
  if (!id) return null
  return prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { pages: true, pillars: true, jobs: true } },
    },
  })
}

/**
 * Get a project by slug and verify the user has owner or admin role.
 * Returns the project or null if not found / no admin access.
 */
export async function getProjectBySlugForAdmin(
  slug: string,
  userId: string
): Promise<Project | null> {
  const id = await getProjectIdBySlug(slug, userId, true)
  if (!id) return null
  return prisma.project.findUnique({ where: { id } })
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Get a page by project slug + page slug (or page id).
 * Verifies user has access to the project.
 */
export async function getPageByProjectSlugAndPageIdentifier(
  projectSlug: string,
  pageSlugOrId: string,
  userId: string
) {
  const projectId = await getProjectIdBySlug(projectSlug, userId, false)
  if (!projectId) return null
  const isUuid = UUID_REGEX.test(pageSlugOrId)
  if (isUuid) {
    return prisma.page.findFirst({
      where: { id: pageSlugOrId, projectId },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        matches: {
          include: {
            pillar: { select: { id: true, name: true, projectId: true } },
          },
          orderBy: { relevanceScore: 'desc' },
        },
      },
    })
  }
  return prisma.page.findFirst({
    where: { projectId, slug: pageSlugOrId },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      matches: {
        include: {
          pillar: { select: { id: true, name: true, projectId: true } },
        },
        orderBy: { relevanceScore: 'desc' },
      },
    },
  })
}
