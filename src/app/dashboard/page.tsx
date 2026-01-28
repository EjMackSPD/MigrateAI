import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import styles from './Dashboard.module.css'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get user's projects
  const projects = await prisma.project.findMany({
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
    include: {
      _count: {
        select: {
          pages: true,
          pillars: true,
          jobs: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 10,
  })

  // Get recent jobs
  const recentJobs = await prisma.job.findMany({
    where: {
      project: {
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
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  // Calculate stats
  const stats = {
    totalProjects: await prisma.project.count({
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
    }),
    totalPages: await prisma.page.count({
      where: {
        project: {
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
      },
    }),
    totalDrafts: await prisma.draft.count({
      where: {
        pillar: {
          project: {
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
        },
      },
    }),
  }

  return (
    <MainLayout projects={projects}>
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard</h1>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.totalProjects}</h3>
            <p className={styles.statLabel}>Projects</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.totalPages}</h3>
            <p className={styles.statLabel}>Pages Crawled</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.totalDrafts}</h3>
            <p className={styles.statLabel}>Drafts Created</p>
          </div>
        </div>

        <div className={styles.sections}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Projects</h2>
            {projects.length === 0 ? (
              <p className={styles.empty}>No projects yet. Create your first project to get started.</p>
            ) : (
              <div className={styles.projectList}>
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={styles.projectCard}
                  >
                    <h3 className={styles.projectName}>{project.name}</h3>
                    <p className={styles.projectClient}>{project.clientName}</p>
                    <div className={styles.projectStats}>
                      <span>{project._count.pages} pages</span>
                      <span>{project._count.pillars} pillars</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Jobs</h2>
            {recentJobs.length === 0 ? (
              <p className={styles.empty}>No recent jobs</p>
            ) : (
              <div className={styles.jobList}>
                {recentJobs.map((job) => (
                  <div key={job.id} className={styles.jobCard}>
                    <div className={styles.jobHeader}>
                      <span className={styles.jobType}>{job.jobType}</span>
                      <span className={`${styles.jobStatus} ${styles[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className={styles.jobProject}>{job.project?.name}</p>
                    {job.progress > 0 && (
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
