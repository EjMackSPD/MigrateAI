import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectPath } from '@/lib/utils/slugify'
import { redirect, notFound } from 'next/navigation'

async function checkPageAccess(pageId: string, userId: string) {
  return prisma.page.findFirst({
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
          slug: true,
        },
      },
    },
  })
}

export default async function PageDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const page = await checkPageAccess(params.id, session.user.id)
  if (!page) {
    notFound()
  }

  // Redirect to new URL structure: /projects/{slug}/pages/{pageSlug}
  const projectSlug = getProjectPath(page.project)
  const pageSlug = page.slug && page.slug !== 'undefined' ? page.slug : page.id
  redirect(`/projects/${projectSlug}/pages/${pageSlug}`)
}
