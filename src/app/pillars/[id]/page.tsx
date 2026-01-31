import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import PillarDetailClient from './PillarDetailClient'

async function checkPillarAccess(pillarId: string, userId: string) {
  const pillar = await prisma.pillar.findFirst({
    where: {
      id: pillarId,
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
        },
      },
      _count: {
        select: {
          matches: true,
          drafts: true,
        },
      },
    },
  })
  return pillar
}

export default async function PillarDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const pillar = await checkPillarAccess(params.id, session.user.id)
  if (!pillar) {
    notFound()
  }

  // Get matches
  const matches = await prisma.match.findMany({
    where: {
      pillarId: params.id,
      isSelected: true,
    },
    include: {
      page: {
        select: {
          id: true,
          url: true,
          title: true,
          wordCount: true,
          contentType: true,
        },
      },
    },
    orderBy: {
      relevanceScore: 'desc',
    },
    take: 20,
  })

  // Get drafts
  const drafts = await prisma.draft.findMany({
    where: {
      pillarId: params.id,
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  })

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
      <PillarDetailClient pillar={pillar} matches={matches} drafts={drafts} />
    </MainLayout>
  )
}
