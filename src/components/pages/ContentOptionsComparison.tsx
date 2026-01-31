'use client'

import { formatContentType, getContentTypeIcon, getContentTypeDescription, type ContentType } from '@/lib/utils/content-types'
import styles from './ContentOptionsComparison.module.css'

interface ContentOptionsComparisonProps {
  page: {
    wordCount: number | null
    contentType: string | null
    detectedTopics: string[]
    qualityScore: number | null
  }
  onSelectContentType?: (contentType: ContentType) => void
}

const CONTENT_TYPE_RECOMMENDATIONS: Record<ContentType, {
  idealFor: string[]
  minWordCount?: number
  maxWordCount?: number
  requiresTopics?: boolean
  qualityThreshold?: number
}> = {
  pillar_page: {
    idealFor: ['Comprehensive topics', 'Hub content', 'Main landing pages'],
    minWordCount: 1500,
    requiresTopics: true,
    qualityThreshold: 0.7,
  },
  supporting_article: {
    idealFor: ['Focused subtopics', 'Deep dives', 'Specific aspects'],
    minWordCount: 800,
    maxWordCount: 1200,
    requiresTopics: true,
  },
  faq_page: {
    idealFor: ['Question-based content', 'Support pages', 'Common queries'],
    minWordCount: 500,
    requiresTopics: false,
  },
  glossary: {
    idealFor: ['Term definitions', 'Reference content', 'Educational material'],
    minWordCount: 300,
    requiresTopics: true,
  },
  comparison: {
    idealFor: ['Product comparisons', 'Option evaluations', 'Decision guides'],
    minWordCount: 1000,
    requiresTopics: true,
  },
}

function getRecommendationScore(
  contentType: ContentType,
  page: ContentOptionsComparisonProps['page']
): { score: number; reasons: string[] } {
  const rec = CONTENT_TYPE_RECOMMENDATIONS[contentType]
  const reasons: string[] = []
  let score = 0

  // Word count check
  if (page.wordCount) {
    if (rec.minWordCount && page.wordCount >= rec.minWordCount) {
      score += 30
      reasons.push(`Meets minimum word count (${rec.minWordCount}+ words)`)
    } else if (rec.minWordCount) {
      reasons.push(`Below recommended word count (needs ${rec.minWordCount}+ words)`)
    }

    if (rec.maxWordCount && page.wordCount <= rec.maxWordCount) {
      score += 20
      reasons.push(`Within ideal range (${rec.maxWordCount} words or less)`)
    } else if (rec.maxWordCount && page.wordCount > rec.maxWordCount) {
      reasons.push(`Exceeds ideal range (consider breaking into multiple pieces)`)
    }
  }

  // Topics check
  if (rec.requiresTopics) {
    if (page.detectedTopics && page.detectedTopics.length > 0) {
      score += 25
      reasons.push(`Has ${page.detectedTopics.length} detected topic${page.detectedTopics.length !== 1 ? 's' : ''}`)
    } else {
      reasons.push('Missing topic detection (may need analysis)')
    }
  } else {
    score += 15
    reasons.push('Topics not required for this content type')
  }

  // Quality score check
  if (rec.qualityThreshold && page.qualityScore !== null) {
    if (Number(page.qualityScore) >= rec.qualityThreshold) {
      score += 25
      reasons.push(`High quality score (${(Number(page.qualityScore) * 100).toFixed(0)}%)`)
    } else {
      reasons.push(`Quality score below threshold (${(Number(page.qualityScore) * 100).toFixed(0)}%)`)
    }
  } else if (page.qualityScore !== null) {
    score += 15
    reasons.push(`Quality score: ${(Number(page.qualityScore) * 100).toFixed(0)}%`)
  }

  return { score, reasons }
}

export default function ContentOptionsComparison({
  page,
  onSelectContentType,
}: ContentOptionsComparisonProps) {
  const allContentTypes: ContentType[] = [
    'pillar_page',
    'supporting_article',
    'faq_page',
    'glossary',
    'comparison',
  ]

  const recommendations = allContentTypes.map((contentType) => {
    const rec = CONTENT_TYPE_RECOMMENDATIONS[contentType]
    const { score, reasons } = getRecommendationScore(contentType, page)
    return {
      contentType,
      score,
      reasons,
      recommendation: rec,
    }
  })

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score)

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981' // green
    if (score >= 50) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Excellent Match'
    if (score >= 50) return 'Good Match'
    return 'Fair Match'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>📝</span>
          GEO-Friendly Content Options
        </h3>
        <p className={styles.subtitle}>
          Recommended content types based on this page's characteristics
        </p>
      </div>

      <div className={styles.optionsGrid}>
        {recommendations.map((rec) => (
          <div
            key={rec.contentType}
            className={`${styles.optionCard} ${
              rec.score >= 70 ? styles.recommended : ''
            }`}
            onClick={() => onSelectContentType?.(rec.contentType)}
          >
            <div className={styles.optionHeader}>
              <div className={styles.optionIcon}>
                {getContentTypeIcon(rec.contentType)}
              </div>
              <div className={styles.optionInfo}>
                <h4 className={styles.optionTitle}>
                  {formatContentType(rec.contentType)}
                </h4>
                <p className={styles.optionDescription}>
                  {getContentTypeDescription(rec.contentType)}
                </p>
              </div>
              <div
                className={styles.scoreBadge}
                style={{ backgroundColor: getScoreColor(rec.score) }}
              >
                <span className={styles.scoreValue}>{rec.score}</span>
                <span className={styles.scoreLabel}>
                  {getScoreLabel(rec.score)}
                </span>
              </div>
            </div>

            <div className={styles.optionDetails}>
              <div className={styles.idealFor}>
                <strong>Ideal for:</strong>
                <ul>
                  {rec.recommendation.idealFor.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.reasons}>
                <strong>Why this fits:</strong>
                <ul>
                  {rec.reasons.map((reason, i) => (
                    <li key={i} className={styles.reason}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {onSelectContentType && (
              <button
                className={styles.selectButton}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectContentType(rec.contentType)
                }}
              >
                Generate {formatContentType(rec.contentType)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
