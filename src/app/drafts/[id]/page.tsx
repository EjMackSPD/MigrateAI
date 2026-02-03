'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import { formatContentType, getContentTypeIcon } from '@/lib/utils/content-types'
import styles from './DraftEditor.module.css'

interface SourcePage {
  id: string
  url: string
  title: string | null
  extractedContent: string | null
}

interface DraftVersion {
  id: string
  versionNumber: number
  changeNotes: string | null
  createdAt: Date
  createdBy: string | null
}

interface Draft {
  id: string
  title: string
  content: string
  contentType: string
  status: string
  sourcePages: SourcePage[]
  versions: DraftVersion[]
}

export default function DraftEditorPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const draftId = params.id as string
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [changeNotes, setChangeNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    fetchDraft()
  }, [draftId])

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/drafts/${draftId}`)
      if (!response.ok) throw new Error('Failed to fetch draft')
      const data = await response.json()
      setDraft(data)
      setContent(data.content)
      setTitle(data.title)
    } catch (err) {
      setError('Failed to load draft')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          changeNotes: changeNotes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to save draft')
        toast.showError(data.error || 'Failed to save draft')
        return
      }

      const updated = await response.json()
      setDraft(updated)
      setChangeNotes('')
      toast.showSuccess('Draft saved successfully')
    } catch (err) {
      setError('An error occurred while saving')
      toast.showError('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this draft?')) return

    try {
      const response = await fetch(`/api/drafts/${draftId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to approve draft')

      toast.showSuccess('Draft approved successfully!')
      fetchDraft()
    } catch (err) {
      setError('Failed to approve draft')
      toast.showError('Failed to approve draft')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <p>Loading...</p>
        </div>
      </MainLayout>
    )
  }

  if (!draft) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <p>Draft not found</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Draft</h1>
          <div className={styles.actions}>
            <button
              onClick={() => setShowSources(!showSources)}
              className={styles.toggleButton}
            >
              {showSources ? 'Hide' : 'Show'} Sources
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={styles.toggleButton}
            >
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {draft.status !== 'approved' && (
              <button
                onClick={handleApprove}
                className={styles.approveButton}
              >
                Approve
              </button>
            )}
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.statusBar}>
          <span className={styles.statusLabel}>Status:</span>
          <span className={`${styles.status} ${styles[draft.status]}`}>
            {draft.status}
          </span>
          {draft.contentType && (
            <>
              <span className={styles.statusLabel}>Type:</span>
              <span className={styles.contentType}>
                {getContentTypeIcon(draft.contentType)} {formatContentType(draft.contentType)}
              </span>
            </>
          )}
        </div>

        <div className={styles.editorLayout}>
          {showSources && (
            <div className={styles.sourcesPanel}>
              <h3>Source Pages</h3>
              {draft.sourcePages.map((page) => (
                <div key={page.id} className={styles.sourceCard}>
                  <h4>{page.title || page.url}</h4>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    {page.url}
                  </a>
                  {page.extractedContent && (
                    <div className={styles.sourceContent}>
                      {page.extractedContent.substring(0, 500)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={styles.editorArea}>
            <div className={styles.titleInput}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Draft title"
                className={styles.titleField}
              />
            </div>

            {showPreview ? (
              <div className={styles.preview}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: content
                      .replace(/\n/g, '<br>')
                      .replace(/#{1,6}\s+(.+)/g, (match, text) => {
                        const level = match.match(/^#+/)?.[0]?.length ?? 1
                        return `<h${level}>${text}</h${level}>`
                      }),
                  }}
                />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={styles.editor}
                placeholder="Write your content in Markdown..."
              />
            )}

            <div className={styles.changeNotes}>
              <label htmlFor="changeNotes">Change Notes (optional)</label>
              <input
                id="changeNotes"
                type="text"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Describe what changed..."
                className={styles.changeNotesInput}
              />
            </div>
          </div>
        </div>

        {draft.versions.length > 0 && (
          <div className={styles.versions}>
            <h3>Version History</h3>
            <div className={styles.versionList}>
              {draft.versions.map((version) => (
                <div key={version.id} className={styles.versionItem}>
                  <div className={styles.versionHeader}>
                    <span className={styles.versionNumber}>
                      Version {version.versionNumber}
                    </span>
                    <span className={styles.versionDate}>
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {version.changeNotes && (
                    <p className={styles.versionNotes}>{version.changeNotes}</p>
                  )}
                  {version.createdBy && (
                    <p className={styles.versionAuthor}>
                      by {version.createdBy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
