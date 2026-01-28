import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import styles from './Pages.module.css'

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

export default async function PagesPage({
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

  const pages = await prisma.page.findMany({
    where: { projectId: params.id },
    select: {
      id: true,
      url: true,
      title: true,
      status: true,
      wordCount: true,
      qualityScore: true,
      detectedTopics: true,
      crawledAt: true,
      analyzedAt: true,
    },
    orderBy: {
      crawledAt: 'desc',
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

  const stats = {
    total: pages.length,
    analyzed: pages.filter((p) => p.status === 'analyzed').length,
    pending: pages.filter((p) => p.status === 'pending').length,
    failed: pages.filter((p) => p.status === 'failed').length,
  }

  return (
    <MainLayout projects={allProjects}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Link href={`/projects/${params.id}`} className={styles.backLink}>
              ← Back to Project
            </Link>
            <h1 className={styles.title}>Crawled Pages</h1>
            <p className={styles.subtitle}>{project.name}</p>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.total}</h3>
            <p className={styles.statLabel}>Total Pages</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.analyzed}</h3>
            <p className={styles.statLabel}>Analyzed</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.pending}</h3>
            <p className={styles.statLabel}>Pending</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.failed}</h3>
            <p className={styles.statLabel}>Failed</p>
          </div>
        </div>

        {pages.length === 0 ? (
          <div className={styles.empty}>
            <p>No pages have been crawled yet.</p>
            <Link
              href={`/projects/${params.id}/crawl`}
              className={styles.emptyButton}
            >
              Start Crawl
            </Link>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Word Count</th>
                  <th>Quality Score</th>
                  <th>Topics</th>
                  <th>Crawled</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td>
                      <strong>{page.title || 'Untitled'}</strong>
                    </td>
                    <td>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.urlLink}
                      >
                        {page.url}
                      </a>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[page.status]}`}>
                        {page.status}
                      </span>
                    </td>
                    <td>{page.wordCount || '-'}</td>
                    <td>
                      {page.qualityScore !== null
                        ? `${(page.qualityScore * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    <td>
                      {page.detectedTopics && page.detectedTopics.length > 0 ? (
                        <div className={styles.topics}>
                          {page.detectedTopics.slice(0, 3).map((topic, i) => (
                            <span key={i} className={styles.topic}>
                              {topic}
                            </span>
                          ))}
                          {page.detectedTopics.length > 3 && (
                            <span className={styles.moreTopics}>
                              +{page.detectedTopics.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {page.crawledAt
                        ? new Date(page.crawledAt).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
