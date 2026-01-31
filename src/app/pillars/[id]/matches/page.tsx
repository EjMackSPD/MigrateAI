'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import styles from './Matches.module.css'

interface Match {
  id: string
  relevanceScore: number
  isSelected: boolean
  isExcluded: boolean
  page: {
    id: string
    url: string
    title: string | null
    wordCount: number | null
    contentType: string | null
  }
}

interface Pillar {
  id: string
  name: string
  projectId: string
  project: {
    id: string
    name: string
  }
}

export default function MatchesPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const pillarId = params.id as string
  const [pillar, setPillar] = useState<Pillar | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [pillarId])

  const fetchData = async () => {
    try {
      // Fetch pillar
      const pillarRes = await fetch(`/api/pillars/${pillarId}`)
      if (!pillarRes.ok) throw new Error('Failed to fetch pillar')
      const pillarData = await pillarRes.json()
      setPillar(pillarData)

      // Fetch matches
      const matchesRes = await fetch(`/api/pillars/${pillarId}/matches`)
      if (!matchesRes.ok) throw new Error('Failed to fetch matches')
      const matchesData = await matchesRes.json()
      setMatches(matchesData.matches || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      toast.showError('Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (matchId: string, isSelected: boolean) => {
    setUpdating(matchId)
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSelected: !isSelected,
          isExcluded: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update match')
      }

      toast.showSuccess(isSelected ? 'Match unselected' : 'Match selected')
      fetchData()
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to update match')
    } finally {
      setUpdating(null)
    }
  }

  const handleExclude = async (matchId: string) => {
    setUpdating(matchId)
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSelected: false,
          isExcluded: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to exclude match')
      }

      toast.showSuccess('Match excluded')
      fetchData()
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to exclude match')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Loading matches...</div>
        </div>
      </MainLayout>
    )
  }

  if (!pillar) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.error}>Pillar not found</div>
        </div>
      </MainLayout>
    )
  }

  const selectedMatches = matches.filter((m) => m.isSelected)
  const excludedMatches = matches.filter((m) => m.isExcluded)

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href={`/pillars/${pillarId}`} className={styles.backLink}>
            ← Back to Pillar
          </Link>
          <div>
            <h1 className={styles.title}>Matches for {pillar.name}</h1>
            <Link
              href={`/projects/${pillar.projectId}`}
              className={styles.projectLink}
            >
              Project: {pillar.project.name}
            </Link>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{matches.length}</h3>
            <p className={styles.statLabel}>Total Matches</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{selectedMatches.length}</h3>
            <p className={styles.statLabel}>Selected</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{excludedMatches.length}</h3>
            <p className={styles.statLabel}>Excluded</p>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className={styles.empty}>
            <p>No matches found yet. Start a matching job to find relevant pages.</p>
            <Link
              href={`/pillars/${pillarId}`}
              className={styles.emptyButton}
            >
              Go to Pillar
            </Link>
          </div>
        ) : (
          <div className={styles.matchesList}>
            {matches.map((match) => (
              <div
                key={match.id}
                className={`${styles.matchCard} ${
                  match.isSelected ? styles.selected : ''
                } ${match.isExcluded ? styles.excluded : ''}`}
              >
                <div className={styles.matchHeader}>
                  <div className={styles.matchInfo}>
                    <h3 className={styles.matchTitle}>
                      {match.page.title || 'Untitled'}
                    </h3>
                    <a
                      href={match.page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.matchUrl}
                    >
                      {match.page.url}
                    </a>
                  </div>
                  <div className={styles.matchScore}>
                    {(Number(match.relevanceScore) * 100).toFixed(0)}% match
                  </div>
                </div>

                <div className={styles.matchMeta}>
                  <span>{match.page.wordCount || 0} words</span>
                  {match.page.contentType && (
                    <span className={styles.contentType}>
                      {match.page.contentType}
                    </span>
                  )}
                </div>

                <div className={styles.matchActions}>
                  <button
                    onClick={() => handleToggle(match.id, match.isSelected)}
                    disabled={updating === match.id || match.isExcluded}
                    className={`${styles.actionButton} ${
                      match.isSelected ? styles.selectedButton : styles.selectButton
                    }`}
                  >
                    {updating === match.id
                      ? 'Updating...'
                      : match.isSelected
                      ? '✓ Selected'
                      : 'Select'}
                  </button>
                  <button
                    onClick={() => handleExclude(match.id)}
                    disabled={updating === match.id || match.isExcluded}
                    className={`${styles.actionButton} ${styles.excludeButton}`}
                  >
                    {match.isExcluded ? 'Excluded' : 'Exclude'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
