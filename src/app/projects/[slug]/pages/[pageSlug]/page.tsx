import { getServerSession, authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import PageDetailClient from '@/components/pages/PageDetailClient'
import PageDetailActions from '@/components/pages/PageDetailActions'
import { formatContentType, getContentTypeIcon } from '@/lib/utils/content-types'
import ContentSectionClient from '@/components/pages/ContentSectionClient'
import { getProjectPath } from '@/lib/utils/slugify'
import { prisma } from '@/lib/db'
import { getPageByProjectSlugAndPageIdentifier } from '@/lib/project-access'
import { parsePageStructure, getMetaGaps } from '@/lib/utils/parse-page-structure'
import { getContentRecommendations } from '@/lib/utils/content-recommendations'
import styles from '@/app/pages/[id]/PageDetail.module.css'

export default async function ProjectPageDetailPage({
  params,
}: {
  params: { slug: string; pageSlug: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const page = await getPageByProjectSlugAndPageIdentifier(
    params.slug,
    params.pageSlug,
    session.user.id
  )
  if (!page) {
    notFound()
  }

  const projectSlug = getProjectPath(page.project)
  const structure = parsePageStructure(page.rawHtml, page.url)
  const metaGaps = getMetaGaps(structure.metaTags)

  const h1Headings = structure.headings.filter((h) => h.level === 1)
  const h1Count = h1Headings.length
  const h1UniqueCount = new Set(h1Headings.map((h) => h.text.trim().toLowerCase())).size

  const contentRecommendations = getContentRecommendations({
    h1Count,
    h1UniqueCount,
    wordCount: page.wordCount,
    contentType: page.contentType,
    qualityScore: page.qualityScore != null ? Number(page.qualityScore) : null,
    metaGaps,
    images: structure.images,
    hasStructuredContent: !!page.structuredContent,
  })

  const allProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true, name: true, slug: true },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <MainLayout projects={allProjects}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link
            href={`/projects/${projectSlug}#pages`}
            className={styles.backLink}
          >
            ← Back to Pages
          </Link>
          <div className={styles.headerRow}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>{page.title || 'Untitled Page'}</h1>
              <Link href={`/projects/${projectSlug}`} className={styles.projectLink}>
                Project: {page.project.name}
              </Link>
            </div>
            <div className={styles.statusBadge}>
              <span className={`${styles.status} ${styles[page.status]}`}>
                {page.status}
              </span>
            </div>
            <PageDetailActions
              pageId={page.id}
              projectSlug={projectSlug}
              pageUrl={page.url}
              pageTitle={page.title}
            />
          </div>
        </div>

        <PageDetailClient
          pageId={page.id}
          projectSlug={projectSlug}
          page={{
            wordCount: page.wordCount,
            contentType: page.contentType,
            detectedTopics: page.detectedTopics || [],
            qualityScore: page.qualityScore != null ? Number(page.qualityScore) : null,
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
                      {getContentTypeIcon(page.contentType)}{' '}
                      {formatContentType(page.contentType)}
                    </span>
                  </div>
                )}
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>H1s</span>
                    <span
                      className={styles.infoValue}
                      title={h1Count > 0 ? `${h1UniqueCount} unique` : undefined}
                    >
                      {h1Count}
                      {h1Count > 0 && h1UniqueCount !== h1Count && (
                        <span className={styles.infoSub}>
                          {' '}({h1UniqueCount} unique)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Words</span>
                    <span className={styles.infoValue}>{page.wordCount ?? '-'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Characters</span>
                    <span className={styles.infoValue}>
                      {page.extractedContent
                        ? page.extractedContent.length.toLocaleString()
                        : '-'}
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

            {structure.regions.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>⊞</span>
                  <h2 className={styles.sectionTitle}>Page Structure</h2>
                  <span className={styles.sectionBadge}>
                    {structure.regions.length} regions
                  </span>
                </div>
                <div className={styles.card}>
                  <p className={styles.sectionIntro}>
                    Semantic HTML regions (header, main, footer, etc.) with their
                    headings and content.
                  </p>
                  <div className={styles.regionsList}>
                    {structure.regions.map((region, ri) => (
                      <div key={ri} className={styles.regionCard}>
                        <div className={styles.regionHeader}>
                          <span className={styles.regionTag}>
                            &lt;{region.tag}&gt;
                          </span>
                          <span className={styles.regionStats}>
                            {region.wordCount} words
                            {region.headings.length > 0 &&
                              ` · ${region.headings.length} headings`}
                          </span>
                        </div>
                        {region.headings.length > 0 && (
                          <ul className={styles.headingList}>
                            {region.headings.map((h, i) => (
                              <li
                                key={i}
                                className={styles.headingItem}
                                data-level={h.level}
                              >
                                <span className={styles.headingLevel}>
                                  H{h.level}
                                </span>
                                <span className={styles.headingText}>
                                  {h.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {region.sections && region.sections.length > 0 ? (
                          <div className={styles.contentSections}>
                            {region.sections.map((sec, si) => (
                              <div key={si} className={styles.contentSection}>
                                <div className={styles.sectionHeading}>
                                  H{sec.heading.level}: {sec.heading.text}
                                </div>
                                {sec.content && (
                                  <p className={styles.sectionContent}>
                                    {sec.content}
                                    {sec.wordCount > 0 && (
                                      <span className={styles.sectionWordCount}>
                                        {' '}({sec.wordCount} words)
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          region.contentPreview && (
                            <p className={styles.regionPreview}>
                              {region.contentPreview}
                            </p>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>⌘</span>
                <h2 className={styles.sectionTitle}>Metadata Best Practices</h2>
              </div>
              <div className={styles.card}>
                <p className={styles.sectionIntro}>
                  Recommended meta tags for SEO and social sharing. Gaps indicate
                  missing tags.
                </p>
                <div className={styles.metaGapsList}>
                  {metaGaps.map((gap, i) => (
                    <div
                      key={i}
                      className={`${styles.metaGapRow} ${
                        gap.status === 'present' ? styles.metaPresent : styles.metaMissing
                      } ${
                        gap.status === 'missing' && gap.required
                          ? styles.metaMissingRequired
                          : ''
                      }`}
                    >
                      <div className={styles.metaGapHeader}>
                        <span className={styles.metaGapKey}>{gap.key}</span>
                        <span className={styles.metaGapCategory}>
                          {gap.category}
                        </span>
                        {gap.required && (
                          <span className={styles.metaRequired}>Required</span>
                        )}
                        <span className={styles.metaGapStatus}>
                          {gap.status === 'present' ? '✓ Present' : '○ Missing'}
                        </span>
                      </div>
                      {gap.value && (
                        <div className={styles.metaGapValue}>
                          {gap.value.length > 120
                            ? `${gap.value.slice(0, 120)}…`
                            : gap.value}
                        </div>
                      )}
                      <div className={styles.metaGapGuidance}>
                        {gap.guidance}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(page.structuredContent || page.extractedContent) && (
              <ContentSectionClient
                pageId={page.id}
                structuredContent={page.structuredContent}
                extractedContent={page.extractedContent}
                wordCount={page.wordCount}
                recommendations={contentRecommendations}
                sectionStyles={{
                  section: styles.section,
                  sectionHeader: styles.sectionHeader,
                  sectionIcon: styles.sectionIcon,
                  sectionTitle: styles.sectionTitle,
                  sectionBadge: styles.sectionBadge,
                  card: styles.card,
                  contentRendered: styles.contentRendered,
                }}
              />
            )}

            {structure.images.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>🖼</span>
                  <h2 className={styles.sectionTitle}>Assets</h2>
                  <span className={styles.sectionBadge}>
                    {structure.images.length} image
                    {structure.images.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.card}>
                  <p className={styles.sectionIntro}>
                    Images linked from this page. Click to open the asset.
                  </p>
                  <div className={styles.assetsGrid}>
                    {structure.images.map((img, i) => (
                      <a
                        key={i}
                        href={img.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.assetCard}
                      >
                        <div className={styles.assetPreview}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.src}
                            alt={img.alt || 'Asset'}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className={styles.assetInfo}>
                          <span className={styles.assetUrl} title={img.src}>
                            {img.src.length > 60
                              ? img.src.slice(0, 60) + '…'
                              : img.src}
                          </span>
                          {img.alt && (
                            <span className={styles.assetAlt}>{img.alt}</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {structure.outboundLinks.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>↗</span>
                  <h2 className={styles.sectionTitle}>Outbound Links</h2>
                  <span className={styles.sectionBadge}>
                    {structure.outboundLinks.length} link
                    {structure.outboundLinks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.card}>
                  <p className={styles.sectionIntro}>
                    Links to external sites (different domain).
                  </p>
                  <ul className={styles.outboundList}>
                    {structure.outboundLinks.map((link, i) => (
                      <li key={i} className={styles.outboundItem}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.outboundLink}
                        >
                          {link.text || link.href}
                        </a>
                        {link.text && link.href !== link.text && (
                          <span
                            className={styles.outboundUrl}
                            title={link.href}
                          >
                            {link.href}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
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
                    <span className={styles.statValue}>
                      {page.wordCount || '-'}
                    </span>
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
                      <span className={styles.statValue}>
                        {page.crawlDepth}
                      </span>
                      <span className={styles.statLabel}>Crawl Depth</span>
                    </div>
                  </div>
                )}
                {page.detectedTopics && page.detectedTopics.length > 0 && (
                  <div className={styles.stat}>
                    <div className={styles.statIcon}>◇</div>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>
                        {page.detectedTopics.length}
                      </span>
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
