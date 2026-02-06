import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlugWithDetails } from '@/lib/project-access'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import type { WorkflowStage } from '@/lib/utils/workflow'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const project = await getProjectBySlugWithDetails(params.slug, session.user.id)
  if (!project) {
    notFound()
  }

  // Get stats
  const stats = {
    pagesCrawled: await prisma.page.count({
      where: { projectId: project.id },
    }),
    pagesAnalyzed: await prisma.page.count({
      where: { projectId: project.id, status: 'analyzed' },
    }),
    pillarsCount: await prisma.pillar.count({
      where: { projectId: project.id },
    }),
    draftsCount: await prisma.draft.count({
      where: {
        pillar: {
          projectId: project.id,
        },
      },
    }),
    draftsApproved: await prisma.draft.count({
      where: {
        pillar: {
          projectId: project.id,
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
      <ProjectDetailClient
        project={{ ...project, workflowStage: project.workflowStage as WorkflowStage }}
        stats={stats}
      />
    </MainLayout>
  )
}
