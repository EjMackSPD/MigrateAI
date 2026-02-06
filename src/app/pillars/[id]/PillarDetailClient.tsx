'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'
import { formatContentType, getContentTypeIcon } from '@/lib/utils/content-types'
import styles from './PillarDetail.module.css'

interface Pillar {
  id: string
  name: string
  description: string
  targetAudience: string | null
  keyThemes: string[]
  primaryKeywords: string[]
  toneNotes: string | null
  priority: number
  status: string
  projectId: string
  project: {
    id: string
    name: string
  }
  _count: {
    matches: number
    drafts: number
  }
}

interface Match {
  id: string
  relevanceScore: number | null
  page: {
    id: string
    url: string
    title: string | null
    wordCount: number | null
    contentType: string | null
  }
}

interface Draft {
  id: string
  title: string
  contentType: string
  status: string
  createdAt: string
  _count: {
    versions: number
  }
}

interface PillarDetailClientProps {
  pillar: Pillar
  matches: Match[]
  drafts: Draft[]
}

export default function PillarDetailClient({
  pillar,
  matches,
  drafts,
}: PillarDetailClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [startingMatch, setStartingMatch] = useState(false)

  const handleFindMatches = async () => {
    setStartingMatch(true)
    try {
      const response = await fetch(`/api/pillars/${pillar.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minRelevance: 0.7,
          maxResults: 100,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.showSuccess('Matching job started!')
        router.push(`/jobs/${data.jobId}`)
      } else {
        toast.showError(data.error || 'Failed to start matching')
      }
    } catch (err) {
      toast.showError('Failed to start matching job')
    } finally {
      setStartingMatch(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link
          href={`/projects/${pillar.projectId}/pillars`}
          className={styles.backLink}
        >
          ← Back to Pillars
        </Link>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{pillar.name}</h1>
          <Link
            href={`/projects/${pillar.project.id}`}
            className={styles.projectLink}
          >
            Project: {pillar.project.name}
          </Link>
        </div>
        <div className={styles.statusBadge}>
          <span className={`${styles.status} ${styles[pillar.status]}`}>
            {pillar.status}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Description</h2>
            <p className={styles.description}>{pillar.description}</p>
          </div>

          {pillar.targetAudience && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Target Audience</h2>
              <p className={styles.text}>{pillar.targetAudience}</p>
            </div>
          )}

          {pillar.keyThemes.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Key Themes</h2>
              <div className={styles.themes}>
                {pillar.keyThemes.map((theme, i) => (
                  <span key={i} className={styles.theme}>
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pillar.primaryKeywords.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Primary Keywords</h2>
              <div className={styles.keywords}>
                {pillar.primaryKeywords.map((keyword, i) => (
                  <span key={i} className={styles.keyword}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pillar.toneNotes && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Tone Notes</h2>
              <p className={styles.text}>{pillar.toneNotes}</p>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.statsCard}>
            <h3 className={styles.statsTitle}>Statistics</h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{pillar._count.matches}</span>
                <span className={styles.statLabel}>Matches</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{pillar._count.drafts}</span>
                <span className={styles.statLabel}>Drafts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{pillar.priority}</span>
                <span className={styles.statLabel}>Priority</span>
              </div>
            </div>
          </div>

          <div className={styles.actionsCard}>
            <h3 className={styles.actionsTitle}>Actions</h3>
            <div className={styles.actionButtons}>
              <button
                onClick={handleFindMatches}
                disabled={startingMatch}
                className={styles.actionButton}
              >
                {startingMatch ? 'Starting...' : 'Find Matches'}
              </button>
              <Link
                href={`/pillars/${pillar.id}/matches`}
                className={styles.actionButton}
              >
                View Matches
              </Link>
            </div>
          </div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Selected Matches</h2>
          <div className={styles.matchesList}>
            {matches.map((match) => (
              <div key={match.id} className={styles.matchCard}>
                <div className={styles.matchHeader}>
                  <h3 className={styles.matchTitle}>
                    {match.page.title || 'Untitled'}
                  </h3>
                  <span className={styles.relevanceScore}>
                    {(Number(match.relevanceScore) * 100).toFixed(0)}% match
                  </span>
                </div>
                <a
                  href={match.page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.matchUrl}
                >
                  {match.page.url}
                </a>
                <div className={styles.matchMeta}>
                  <span>{match.page.wordCount || 0} words</span>
                  {match.page.contentType && (
                    <span className={styles.contentType}>
                      {match.page.contentType}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Drafts</h2>
          <div className={styles.draftsList}>
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/drafts/${draft.id}`}
                className={styles.draftCard}
              >
                <div className={styles.draftHeader}>
                  <h3 className={styles.draftTitle}>{draft.title}</h3>
                  <span className={`${styles.draftStatus} ${styles[draft.status]}`}>
                    {draft.status}
                  </span>
                </div>
                <p className={styles.draftMeta}>
                  {getContentTypeIcon(draft.contentType)} {formatContentType(draft.contentType)}
                  {' • '}
                  {draft._count.versions} version{draft._count.versions !== 1 ? 's' : ''}
                  {' • '}
                  {new Date(draft.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
