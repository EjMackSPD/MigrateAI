'use client'

import type { ContentRecommendation, RecommendationSeverity } from '@/lib/utils/content-recommendations'
import styles from './ContentRecommendations.module.css'

interface ContentRecommendationsProps {
  recommendations: ContentRecommendation[]
  compact?: boolean
}

const SEVERITY_LABELS: Record<RecommendationSeverity, string> = {
  high: 'Important',
  medium: 'Consider',
  low: 'Tip',
}

export default function ContentRecommendations({
  recommendations,
  compact = false,
}: ContentRecommendationsProps) {
  if (recommendations.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>
        <span className={styles.icon}>💡</span>
        Content recommendations
      </h3>
      <p className={styles.subtitle}>
        Suggestions to improve this page for SEO, GEO, and accessibility.
      </p>
      <ul className={styles.list}>
        {recommendations.map((rec) => (
          <li
            key={rec.id}
            className={`${styles.item} ${styles[rec.severity]}`}
          >
            <div className={styles.itemHeader}>
              <span className={styles.severity}>
                {SEVERITY_LABELS[rec.severity]}
              </span>
              <span className={styles.recTitle}>{rec.title}</span>
            </div>
            <p className={styles.description}>{rec.description}</p>
            {rec.action && !compact && (
              <p className={styles.action}>
                <strong>Action:</strong> {rec.action}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
