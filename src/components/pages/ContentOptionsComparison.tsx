'use client'

import { useState } from 'react'
import { formatContentType, getContentTypeIcon, type ContentType } from '@/lib/utils/content-types'
import styles from './ContentOptionsComparison.module.css'

interface ContentOptionsComparisonProps {
  pageId: string
  page: {
    wordCount: number | null
    contentType: string | null
    detectedTopics: string[]
    qualityScore: number | null
  }
  onGenerateSuccess?: (jobId: string, pillarId: string) => void
}

const CONTENT_TYPES: ContentType[] = [
  'pillar_page',
  'supporting_article',
  'faq_page',
  'glossary',
  'comparison',
]

function getQuickScore(contentType: ContentType, page: ContentOptionsComparisonProps['page']): number {
  const mins: Record<ContentType, number> = {
    pillar_page: 1500,
    supporting_article: 800,
    faq_page: 500,
    glossary: 300,
    comparison: 1000,
  }
  const min = mins[contentType]
  let score = 50
  if (page.wordCount && page.wordCount >= min) score += 30
  if (page.detectedTopics?.length) score += 20
  if (page.qualityScore !== null && Number(page.qualityScore) >= 0.6) score += 10
  return Math.min(score, 100)
}

export default function ContentOptionsComparison({
  pageId,
  page,
  onGenerateSuccess,
}: ContentOptionsComparisonProps) {
  const [generating, setGenerating] = useState<ContentType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (contentType: ContentType) => {
    setGenerating(contentType)
    setError(null)
    try {
      const res = await fetch(`/api/pages/${pageId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start generation')
      onGenerateSuccess?.(data.jobId, data.pillarId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(null)
    }
  }

  const recommendations = CONTENT_TYPES.map((contentType) => ({
    contentType,
    score: getQuickScore(contentType, page),
  })).sort((a, b) => b.score - a.score)

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'var(--score-high, #10b981)'
    if (score >= 50) return 'var(--score-mid, #f59e0b)'
    return 'var(--score-low, #94a3b8)'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>📝</span>
          GEO Content Options
        </h3>
      </div>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.chipRow}>
        {recommendations.map((rec) => (
          <div key={rec.contentType} className={styles.chip}>
            <span className={styles.chipIcon}>{getContentTypeIcon(rec.contentType)}</span>
            <span className={styles.chipLabel}>{formatContentType(rec.contentType)}</span>
            <span
              className={styles.chipScore}
              style={{ backgroundColor: getScoreColor(rec.score) }}
              title={`Fit: ${rec.score}%`}
            >
              {rec.score}
            </span>
            <button
              type="button"
              className={styles.chipButton}
              onClick={() => handleGenerate(rec.contentType)}
              disabled={generating !== null}
              title={`Generate as ${formatContentType(rec.contentType)}`}
            >
              {generating === rec.contentType ? '…' : 'Generate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
