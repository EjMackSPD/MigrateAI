'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ContentWithNav from './ContentWithNav'
import ContentEditorModal from './ContentEditorModal'
import ContentRecommendations from './ContentRecommendations'
import type { ContentRecommendation } from '@/lib/utils/content-recommendations'
import styles from './ContentSectionClient.module.css'

interface ContentSectionClientProps {
  pageId: string
  structuredContent: string | null
  extractedContent: string | null
  wordCount: number | null
  recommendations?: ContentRecommendation[]
  sectionStyles: {
    section: string
    sectionHeader: string
    sectionIcon: string
    sectionTitle: string
    sectionBadge: string
    card: string
    contentRendered: string
  }
}

export default function ContentSectionClient({
  pageId,
  structuredContent,
  extractedContent,
  wordCount,
  recommendations = [],
  sectionStyles,
}: ContentSectionClientProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  const editableContent = structuredContent || extractedContent || ''

  return (
    <>
      <div className={sectionStyles.section}>
        <div className={sectionStyles.sectionHeader}>
          <span className={sectionStyles.sectionIcon}>¶</span>
          <h2 className={sectionStyles.sectionTitle}>Content</h2>
          <span className={sectionStyles.sectionBadge}>
            {wordCount ?? '~'} words
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={styles.editButton}
            title="Edit content"
          >
            Edit
          </button>
        </div>
        <div className={sectionStyles.card}>
          {recommendations.length > 0 && (
            <ContentRecommendations recommendations={recommendations} />
          )}
          <div className={sectionStyles.contentRendered}>
            <ContentWithNav
              content={structuredContent || ''}
              fallbackContent={extractedContent || undefined}
            />
          </div>
        </div>
      </div>

      {editing && (
        <ContentEditorModal
          pageId={pageId}
          initialContent={editableContent}
          recommendations={recommendations.map((r) => ({
            title: r.title,
            action: r.action,
          }))}
          onClose={() => setEditing(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  )
}
