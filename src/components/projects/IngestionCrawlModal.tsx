'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import styles from './IngestionCrawlModal.module.css'

interface IngestionCrawlModalProps {
  projectId: string
  projectSlug: string
  baseUrl: string
  projectName: string
  onClose: () => void
}

export default function IngestionCrawlModal({
  projectId,
  projectSlug,
  baseUrl,
  projectName,
  onClose,
}: IngestionCrawlModalProps) {
  const router = useRouter()
  const toast = useToast()
  const [maxPages, setMaxPages] = useState(100)
  const [maxDepth, setMaxDepth] = useState(3)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!confirmed) {
      setError('Please confirm that you understand the crawl will run on the site above.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxPages,
          maxDepth,
          rateLimitMs: 1000,
          excludePatterns: ['/admin/*', '/login/*'],
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to start ingestion')
        toast.showError(data.error || 'Failed to start ingestion')
        return
      }

      toast.showSuccess('Ingestion started. Redirecting to progress...')
      onClose()
      router.push(`/projects/${projectSlug}/crawl?job=${data.jobId}`)
    } catch {
      setError('An error occurred. Please try again.')
      toast.showError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Begin Ingestion</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className={styles.subtitle}>
          Crawl the site for <strong>{projectName}</strong>. Configure options below and confirm to start.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Site URL</label>
            <div className={styles.urlDisplay}>{baseUrl}</div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="ingestion-maxPages" className={styles.label}>
                Max pages
              </label>
              <input
                id="ingestion-maxPages"
                type="number"
                min={1}
                max={10000}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value) || 100)}
                className={styles.input}
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="ingestion-maxDepth" className={styles.label}>
                Max depth
              </label>
              <input
                id="ingestion-maxDepth"
                type="number"
                min={1}
                max={10}
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value) || 3)}
                className={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.confirmBlock}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={loading}
                className={styles.checkbox}
              />
              <span>
                I understand that this will crawl the site at the URL above and may take several minutes. I have permission to crawl this site.
              </span>
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !confirmed}
            >
              {loading ? 'Starting...' : 'Begin Ingestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
