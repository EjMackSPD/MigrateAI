'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/contexts/ToastContext'
import styles from './ContentEditorModal.module.css'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface ContentEditorModalProps {
  pageId: string
  initialContent: string
  recommendations?: Array<{ title: string; action?: string }>
  onClose: () => void
  onSuccess: () => void
}

export default function ContentEditorModal({
  pageId,
  initialContent,
  recommendations = [],
  onClose,
  onSuccess,
}: ContentEditorModalProps) {
  const toast = useToast()
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredContent: content ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to save')
        return
      }
      toast.showSuccess('Content saved')
      onSuccess()
      onClose()
    } catch {
      toast.showError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-editor-title"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <h2 id="content-editor-title" className={styles.title}>
              Edit content
            </h2>
            <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
          </div>
          {recommendations.length > 0 && (
            <div className={styles.tips}>
              <span className={styles.tipsLabel}>Tips:</span>
              {recommendations.slice(0, 3).map((r, i) => (
                <span key={i} className={styles.tip}>
                  {r.title}
                  {r.action && ` — ${r.action}`}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.editorWrap}>
          {mounted && (
            <MDEditor
              value={content}
              onChange={(val) => setContent(val ?? '')}
              height={420}
              preview="live"
              visibleDragbar={false}
              data-color-mode="light"
            />
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
