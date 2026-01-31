import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import PageDetailClient from '@/components/pages/PageDetailClient'
import PageDetailActions from '@/components/pages/PageDetailActions'
import { formatContentType, getContentTypeIcon } from '@/lib/utils/content-types'
import { parsePageStructure, getDisplayMeta } from '@/lib/utils/parse-page-structure'
import styles from './PageDetail.module.css'

async function checkPageAccess(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({
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
        },
      },
      matches: {
        include: {
          pillar: {
            select: {
              id: true,
              name: true,
              projectId: true,
            },
          },
        },
        orderBy: {
          relevanceScore: 'desc',
        },
      },
    },
  })
  return page
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

  const structure = parsePageStructure(page.rawHtml)
  const displayMeta = getDisplayMeta(structure.metaTags)

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
          <Link
            href={`/projects/${page.projectId}#pages`}
            className={styles.backLink}
          >
            ← Back to Pages
          </Link>
          <div className={styles.headerRow}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>{page.title || 'Untitled Page'}</h1>
              <Link
                href={`/projects/${page.projectId}`}
                className={styles.projectLink}
              >
                Project: {page.project.name}
              </Link>
            </div>
            <div className={styles.statusBadge}>
              <span className={`${styles.status} ${styles[page.status]}`}>
                {page.status}
              </span>
            </div>
            <PageDetailActions pageId={params.id} projectId={page.projectId} />
          </div>
        </div>

        <PageDetailClient
          pageId={params.id}
          page={{
            wordCount: page.wordCount,
            contentType: page.contentType,
            detectedTopics: page.detectedTopics || [],
            qualityScore: page.qualityScore,
          }}
        />

        <div className={styles.content}>
          <div className={styles.mainSection}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>◉</span>
                <h2 className={styles.sectionTitle}>Page Information</h2>
              </div>
              <div className={styles.card}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>URL</span>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.urlLink}
                  >
                    {page.url}
                  </a>
                </div>
                {page.contentType && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Content Type</span>
                    <span className={styles.contentTypeBadge}>
                      {getContentTypeIcon(page.contentType)} {formatContentType(page.contentType)}
                    </span>
                  </div>
                )}
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Words</span>
                    <span className={styles.infoValue}>{page.wordCount ?? '-'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Characters</span>
                    <span className={styles.infoValue}>
                      {page.extractedContent ? page.extractedContent.length.toLocaleString() : '-'}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Links</span>
                    <span className={styles.infoValue}>{structure.linkCount}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Images</span>
                    <span className={styles.infoValue}>{structure.imageCount}</span>
                  </div>
                  {page.crawlDepth !== null && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Crawl depth</span>
                      <span className={styles.infoValue}>{page.crawlDepth}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {structure.headings.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>§</span>
                  <h2 className={styles.sectionTitle}>Sections Found</h2>
                  <span className={styles.sectionBadge}>{structure.headings.length} headings</span>
                </div>
                <div className={styles.card}>
                  <p className={styles.sectionIntro}>
                    Headings detected in the page (outline structure).
                  </p>
                  <ul className={styles.headingList}>
                    {structure.headings.map((h, i) => (
                      <li
                        key={i}
                        className={styles.headingItem}
                        data-level={h.level}
                      >
                        <span className={styles.headingLevel}>H{h.level}</span>
                        <span className={styles.headingText}>{h.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {displayMeta.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>⌘</span>
                  <h2 className={styles.sectionTitle}>Meta Tags Found</h2>
                </div>
                <div className={styles.card}>
                  <p className={styles.sectionIntro}>
                    Open Graph, Twitter, and other meta tags extracted from the page.
                  </p>
                  <dl className={styles.metaListFound}>
                    {displayMeta.map((m, i) => (
                      <div key={i} className={styles.metaRow}>
                        <dt className={styles.metaKey}>{m.property || m.name}</dt>
                        <dd className={styles.metaVal}>
                          {m.content.length > 120
                            ? `${m.content.slice(0, 120)}…`
                            : m.content}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}

            {page.metaDescription && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>◈</span>
                  <h2 className={styles.sectionTitle}>SEO Metadata</h2>
                </div>
                <div className={styles.card}>
                  <div className={styles.metaDescription}>
                    <span className={styles.metaLabel}>Meta Description</span>
                    <p className={styles.text}>{page.metaDescription}</p>
                  </div>
                </div>
              </div>
            )}

            {page.extractedContent && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>¶</span>
                  <h2 className={styles.sectionTitle}>Content Preview</h2>
                </div>
                <div className={styles.card}>
                  <div className={styles.contentPreview}>
                    <div className={styles.contentPreviewHeader}>
                      <span className={styles.previewLabel}>
                        {page.extractedContent.length} characters
                      </span>
                      <span className={styles.previewLabel}>
                        {page.wordCount || '~'} words
                      </span>
                    </div>
                    <div className={styles.contentText}>
                      {page.extractedContent.length > 1500
                        ? `${page.extractedContent.substring(0, 1500)}...`
                        : page.extractedContent}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {page.detectedTopics && page.detectedTopics.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>◇</span>
                  <h2 className={styles.sectionTitle}>Detected Topics</h2>
                </div>
                <div className={styles.card}>
                  <div className={styles.topics}>
                    {page.detectedTopics.map((topic, i) => (
                      <span key={i} className={styles.topic}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.sidebar}>
            <div className={styles.statsCard}>
              <div className={styles.statsHeader}>
                <span className={styles.statsIcon}>▣</span>
                <h3 className={styles.statsTitle}>Quality Metrics</h3>
              </div>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <div className={styles.statIcon}>#</div>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>{page.wordCount || '-'}</span>
                    <span className={styles.statLabel}>Word Count</span>
                  </div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statIcon}>★</div>
                  <div className={styles.statContent}>
                    <span className={styles.statValue}>
                      {page.qualityScore !== null
                        ? `${(Number(page.qualityScore) * 100).toFixed(0)}%`
                        : '-'}
                    </span>
                    <span className={styles.statLabel}>Quality Score</span>
                  </div>
                </div>
                {page.crawlDepth !== null && (
                  <div className={styles.stat}>
                    <div className={styles.statIcon}>↳</div>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>{page.crawlDepth}</span>
                      <span className={styles.statLabel}>Crawl Depth</span>
                    </div>
                  </div>
                )}
                {page.detectedTopics && page.detectedTopics.length > 0 && (
                  <div className={styles.stat}>
                    <div className={styles.statIcon}>◇</div>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>{page.detectedTopics.length}</span>
                      <span className={styles.statLabel}>Topics Detected</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.metaCard}>
              <div className={styles.metaHeader}>
                <span className={styles.metaIcon}>◷</span>
                <h3 className={styles.metaTitle}>Timeline</h3>
              </div>
              <div className={styles.metaList}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Crawled</span>
                  <span className={styles.metaValue}>
                    {page.crawledAt
                      ? new Date(page.crawledAt).toLocaleString()
                      : '-'}
                  </span>
                </div>
                {page.analyzedAt && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Analyzed</span>
                    <span className={styles.metaValue}>
                      {new Date(page.analyzedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {page.matches && page.matches.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Matched Pillars</h2>
            <div className={styles.matchesList}>
              {page.matches.map((match) => (
                <Link
                  key={match.id}
                  href={`/pillars/${match.pillarId}`}
                  className={styles.matchCard}
                >
                  <div className={styles.matchHeader}>
                    <h3 className={styles.matchTitle}>{match.pillar.name}</h3>
                    <span className={styles.relevanceScore}>
                      {(Number(match.relevanceScore) * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <div className={styles.matchMeta}>
                    <span className={match.isSelected ? styles.selected : ''}>
                      {match.isSelected ? '✓ Selected' : 'Not selected'}
                    </span>
                    {match.isExcluded && (
                      <span className={styles.excluded}>Excluded</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
