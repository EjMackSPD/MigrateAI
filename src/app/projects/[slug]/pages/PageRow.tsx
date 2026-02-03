'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import styles from './Pages.module.css'

interface PageRowProps {
  page: {
    id: string
    slug?: string | null
    url: string
    title: string | null
    status: string
    wordCount: number | null
    qualityScore: number | null
    detectedTopics: string[]
    crawledAt: Date
  }
  projectSlug?: string
  onAction?: () => void
}

export default function PageRow({ page, projectSlug, onAction }: PageRowProps) {
  const router = useRouter()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [rescanning, setRescanning] = useState(false)

  const pagePath =
    projectSlug != null
      ? `/projects/${projectSlug}/pages/${page.slug && page.slug !== 'undefined' ? page.slug : page.id}`
      : `/pages/${page.id}`

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return
    router.push(pagePath)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this page? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to delete page')
        return
      }
      toast.showSuccess('Page deleted')
      onAction?.()
    } catch {
      toast.showError('Failed to delete page')
    } finally {
      setDeleting(false)
    }
  }

  const handleRescan = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setRescanning(true)
    try {
      const res = await fetch(`/api/pages/${page.id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to rescan page')
        return
      }
      toast.showSuccess('Page rescanned')
      onAction?.()
    } catch {
      toast.showError('Failed to rescan page')
    } finally {
      setRescanning(false)
    }
  }

  return (
    <tr className={styles.tableRow} onClick={handleRowClick}>
      <td>
        <Link
          href={pagePath}
          className={styles.pageLink}
          onClick={(e) => e.stopPropagation()}
        >
          <strong>{page.title || 'Untitled'}</strong>
        </Link>
      </td>
      <td>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.urlLink}
          onClick={(e) => e.stopPropagation()}
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
      {projectSlug != null && onAction != null ? (
        <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleRescan}
            disabled={rescanning}
            className={styles.rowButton}
            title="Rescan page"
          >
            {rescanning ? '...' : 'Rescan'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={styles.rowButtonDelete}
            title="Delete page"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </td>
      ) : null}
    </tr>
  )
}
