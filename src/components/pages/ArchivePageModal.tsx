'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import styles from './ArchivePageModal.module.css'

type RedirectTarget = 'url' | 'page' | 'placeholder'

interface ProjectPage {
  id: string
  slug: string | null
  title: string | null
  url: string
}

interface ArchivePageModalProps {
  pageId: string
  pageUrl: string
  pageTitle: string | null
  projectSlug: string
  onClose: () => void
  onSuccess: () => void
}

export default function ArchivePageModal({
  pageId,
  pageUrl,
  pageTitle,
  projectSlug,
  onClose,
  onSuccess,
}: ArchivePageModalProps) {
  const toast = useToast()
  const [targetType, setTargetType] = useState<RedirectTarget>('url')
  const [targetUrl, setTargetUrl] = useState('')
  const [targetPageId, setTargetPageId] = useState('')
  const [notes, setNotes] = useState('')
  const [projectPages, setProjectPages] = useState<ProjectPage[]>([])
  const [loadingPages, setLoadingPages] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}/pages?limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data.pages) {
          setProjectPages(
            data.pages.filter((p: ProjectPage) => p.id !== pageId)
          )
        }
      })
      .catch(() => setProjectPages([]))
      .finally(() => setLoadingPages(false))
  }, [projectSlug, pageId])

  const canSubmit =
    targetType === 'placeholder' ||
    (targetType === 'url' && targetUrl.trim()) ||
    (targetType === 'page' && targetPageId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        targetType,
        notes: notes.trim() || undefined,
      }
      if (targetType === 'url') {
        body.targetUrl = targetUrl.trim()
      } else if (targetType === 'page') {
        body.targetPageId = targetPageId
      }
      const res = await fetch(`/api/pages/${pageId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to archive page')
        return
      }
      toast.showSuccess('Page archived and redirect added')
      onSuccess()
      onClose()
    } catch {
      toast.showError('Failed to archive page')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Archive page</h2>
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
          Archive <strong>{pageTitle || 'this page'}</strong> and add a redirect
          to the redirect list. The page will be marked as archived.
        </p>
        <p className={styles.sourceUrl} title={pageUrl}>
          From: {pageUrl.length > 70 ? pageUrl.slice(0, 70) + '…' : pageUrl}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Redirect to</label>
            <div className={styles.options}>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="targetType"
                  value="url"
                  checked={targetType === 'url'}
                  onChange={() => setTargetType('url')}
                  className={styles.radio}
                />
                <span className={styles.optionLabel}>URL</span>
                <span className={styles.optionDesc}>
                  Redirect to a specific URL (full or path)
                </span>
              </label>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="targetType"
                  value="page"
                  checked={targetType === 'page'}
                  onChange={() => setTargetType('page')}
                  className={styles.radio}
                />
                <span className={styles.optionLabel}>Another page in project</span>
                <span className={styles.optionDesc}>
                  Redirect to a crawled page in this project
                </span>
              </label>
              <label className={styles.option}>
                <input
                  type="radio"
                  name="targetType"
                  value="placeholder"
                  checked={targetType === 'placeholder'}
                  onChange={() => setTargetType('placeholder')}
                  className={styles.radio}
                />
                <span className={styles.optionLabel}>Placeholder</span>
                <span className={styles.optionDesc}>
                  Mark for later — update redirect target when ready
                </span>
              </label>
            </div>
          </div>

          {targetType === 'url' && (
            <div className={styles.field}>
              <label htmlFor="target-url" className={styles.label}>
                Target URL
              </label>
              <input
                id="target-url"
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/new-page or /new-page"
                className={styles.input}
              />
            </div>
          )}

          {targetType === 'page' && (
            <div className={styles.field}>
              <label htmlFor="target-page" className={styles.label}>
                Target page
              </label>
              <select
                id="target-page"
                value={targetPageId}
                onChange={(e) => setTargetPageId(e.target.value)}
                className={styles.select}
                disabled={loadingPages}
              >
                <option value="">
                  {loadingPages ? 'Loading pages…' : 'Select a page'}
                </option>
                {projectPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || 'Untitled'} — {p.url}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(targetType === 'placeholder' || notes) && (
            <div className={styles.field}>
              <label htmlFor="notes" className={styles.label}>
                Notes {targetType === 'placeholder' && '(optional)'}
              </label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. To be updated after migration"
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Archiving…' : 'Archive page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
