'use client'

import { useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/contexts/ToastContext'
import styles from './ContentEditorModal.module.css'

import '@toast-ui/editor/dist/toastui-editor.css'

const Editor = dynamic(
  () => import('@toast-ui/react-editor').then((mod) => mod.Editor),
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
  const editorRef = useRef<{ getInstance: () => { getMarkdown: () => string } } | null>(null)
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
    const markdown = editorRef.current?.getInstance?.()?.getMarkdown?.() ?? initialContent
    setSaving(true)
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredContent: markdown ?? '',
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
            <Editor
              ref={editorRef}
              initialValue={initialContent}
              initialEditType="wysiwyg"
              hideModeSwitch
              height="420px"
              useCommandShortcut
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
