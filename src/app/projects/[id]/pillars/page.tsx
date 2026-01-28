import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import styles from './Pillars.module.css'

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
  })
  return project
}

export default async function PillarsPage({
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

  const pillars = await prisma.pillar.findMany({
    where: { projectId: params.id },
    include: {
      _count: {
        select: {
          matches: true,
          drafts: true,
        },
      },
    },
    orderBy: {
      priority: 'desc',
    },
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
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Content Pillars</h1>
          <Link
            href={`/projects/${params.id}/pillars/new`}
            className={styles.newButton}
          >
            + New Pillar
          </Link>
        </div>

        {pillars.length === 0 ? (
          <div className={styles.empty}>
            <p>No pillars yet. Create your first pillar to organize content.</p>
            <Link
              href={`/projects/${params.id}/pillars/new`}
              className={styles.emptyButton}
            >
              Create Pillar
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {pillars.map((pillar) => (
              <Link
                key={pillar.id}
                href={`/pillars/${pillar.id}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{pillar.name}</h2>
                  <span className={`${styles.status} ${styles[pillar.status]}`}>
                    {pillar.status}
                  </span>
                </div>
                <p className={styles.description}>{pillar.description}</p>
                {pillar.keyThemes.length > 0 && (
                  <div className={styles.themes}>
                    {pillar.keyThemes.slice(0, 3).map((theme, i) => (
                      <span key={i} className={styles.theme}>
                        {theme}
                      </span>
                    ))}
                    {pillar.keyThemes.length > 3 && (
                      <span className={styles.more}>
                        +{pillar.keyThemes.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className={styles.stats}>
                  <span>{pillar._count.matches} matches</span>
                  <span>{pillar._count.drafts} drafts</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
