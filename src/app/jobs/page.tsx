import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import styles from './Jobs.module.css'

export default async function JobsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const jobs = await prisma.job.findMany({
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
    take: 100,
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

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  }

  return (
    <MainLayout projects={allProjects}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>All Jobs</h1>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.total}</h3>
            <p className={styles.statLabel}>Total</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.pending}</h3>
            <p className={styles.statLabel}>Pending</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.running}</h3>
            <p className={styles.statLabel}>Running</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.completed}</h3>
            <p className={styles.statLabel}>Completed</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.failed}</h3>
            <p className={styles.statLabel}>Failed</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className={styles.empty}>
            <p>No jobs yet. Start a crawl or analysis to create your first job.</p>
          </div>
        ) : (
          <div className={styles.jobList}>
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className={styles.jobCard}
              >
                <div className={styles.jobHeader}>
                  <div>
                    <h3 className={styles.jobType}>
                      {job.jobType === 'crawl' && '🔗'}
                      {job.jobType === 'analyze' && '🔎'}
                      {job.jobType === 'match' && '🔗'}
                      {job.jobType === 'generate' && '📝'}
                      {' '}
                      {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}
                    </h3>
                    <p className={styles.jobProject}>{job.project?.name || 'No Project'}</p>
                  </div>
                  <span className={`${styles.jobStatus} ${styles[job.status]}`}>
                    {job.status}
                  </span>
                </div>

                {job.progress > 0 && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className={styles.progressText}>
                      {job.processedItems} / {job.totalItems || '?'} items
                    </div>
                  </div>
                )}

                <div className={styles.jobFooter}>
                  <span className={styles.jobDate}>
                    {new Date(job.createdAt).toLocaleString()}
                  </span>
                  {job.startedAt && (
                    <span className={styles.jobDuration}>
                      Started: {new Date(job.startedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
