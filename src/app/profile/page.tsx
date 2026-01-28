import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { prisma } from '@/lib/db'
import styles from './Profile.module.css'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          createdProjects: true,
          projects: true,
        },
      },
    },
  })

  if (!user) {
    redirect('/login')
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
      <div className={styles.container}>
        <h1 className={styles.title}>Profile</h1>

        <div className={styles.card}>
          <div className={styles.field}>
            <label>Name</label>
            <p className={styles.value}>{user.name || 'Not set'}</p>
          </div>

          <div className={styles.field}>
            <label>Email</label>
            <p className={styles.value}>{user.email}</p>
          </div>

          <div className={styles.field}>
            <label>Member Since</label>
            <p className={styles.value}>
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {user._count.createdProjects}
              </span>
              <span className={styles.statLabel}>Projects Created</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {user._count.projects}
              </span>
              <span className={styles.statLabel}>Total Projects</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
