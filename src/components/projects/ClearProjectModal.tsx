'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import styles from './ClearProjectModal.module.css'

type ClearScope = 'pages' | 'pillars' | 'jobs' | 'all'

interface ClearProjectModalProps {
  projectSlug: string
  projectName: string
  stats: { pagesCrawled: number; pillarsCount: number; draftsCount: number }
  onClose: () => void
  onSuccess: () => void
}

const SCOPE_OPTIONS: { value: ClearScope; label: string; description: string }[] = [
  { value: 'pages', label: 'Crawled pages', description: 'Remove all crawled pages and their matches. You can re-crawl after.' },
  { value: 'pillars', label: 'Pillars & drafts', description: 'Remove all pillars, matches, and drafts for this project.' },
  { value: 'jobs', label: 'Job history', description: 'Remove job records (crawl/analyze/match/generate). Does not delete pages or content.' },
  { value: 'all', label: 'All project data', description: 'Remove pages, pillars, drafts, matches, and jobs. Resets workflow to start.' },
]

export default function ClearProjectModal({
  projectSlug,
  projectName,
  stats,
  onClose,
  onSuccess,
}: ClearProjectModalProps) {
  const toast = useToast()
  const [scope, setScope] = useState<ClearScope>('pages')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const confirmRequired = scope === 'all'
  const confirmMatch = confirmRequired ? projectName.trim().toLowerCase() === confirmText.trim().toLowerCase() : true
  const canSubmit = !loading && (!confirmRequired || confirmMatch)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectSlug}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to clear records')
        return
      }
      toast.showSuccess(data.message || 'Records cleared')
      onSuccess()
      onClose()
    } catch {
      toast.showError('Failed to clear records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Clear records</h2>
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.subtitle}>
          Remove data for <strong>{projectName}</strong>. This cannot be undone.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>What to clear</label>
            <div className={styles.options}>
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} className={styles.option}>
                  <input
                    type="radio"
                    name="scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value as ClearScope)}
                    className={styles.radio}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDesc}>{opt.description}</span>
                </label>
              ))}
            </div>
          </div>

          {scope === 'pages' && stats.pagesCrawled > 0 && (
            <p className={styles.warn}>This will delete {stats.pagesCrawled} page(s).</p>
          )}
          {scope === 'pillars' && (stats.pillarsCount > 0 || stats.draftsCount > 0) && (
            <p className={styles.warn}>
              This will delete {stats.pillarsCount} pillar(s) and {stats.draftsCount} draft(s).
            </p>
          )}
          {scope === 'all' && (
            <div className={styles.confirmBlock}>
              <label className={styles.confirmLabel}>
                Type <strong>{projectName}</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={projectName}
                className={styles.input}
                disabled={loading}
              />
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={!canSubmit}>
              {loading ? 'Clearing...' : 'Clear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
