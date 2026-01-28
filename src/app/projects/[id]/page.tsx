import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ProjectDetailClient from './ProjectDetailClient'

async function getProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id,
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
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          pages: true,
          pillars: true,
          jobs: true,
        },
      },
    },
  })
  return project
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const project = await getProject(params.id, session.user.id)
  if (!project) {
    notFound()
  }

  // Get stats
  const stats = {
    pagesCrawled: await prisma.page.count({
      where: { projectId: params.id },
    }),
    pagesAnalyzed: await prisma.page.count({
      where: { projectId: params.id, status: 'analyzed' },
    }),
    pillarsCount: await prisma.pillar.count({
      where: { projectId: params.id },
    }),
    draftsCount: await prisma.draft.count({
      where: {
        pillar: {
          projectId: params.id,
        },
      },
    }),
    draftsApproved: await prisma.draft.count({
      where: {
        pillar: {
          projectId: params.id,
        },
        status: 'approved',
      },
    }),
  }

  // Get user's projects for sidebar
  const allProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return (
    <MainLayout projects={allProjects}>
      <ProjectDetailClient project={project} stats={stats} />
    </MainLayout>
  )
}
