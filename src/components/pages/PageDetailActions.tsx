'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import styles from './PageDetailActions.module.css'

interface PageDetailActionsProps {
  pageId: string
  projectId: string
}

export default function PageDetailActions({
  pageId,
  projectId,
}: PageDetailActionsProps) {
  const router = useRouter()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [rescanning, setRescanning] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this page? Matches will be removed. This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to delete page')
        return
      }
      toast.showSuccess('Page deleted')
      router.push(`/projects/${projectId}#pages`)
    } catch {
      toast.showError('Failed to delete page')
    } finally {
      setDeleting(false)
    }
  }

  const handleRescan = async () => {
    setRescanning(true)
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.showError(data.error || 'Failed to rescan page')
        return
      }
      toast.showSuccess('Page rescanned')
      router.refresh()
    } catch {
      toast.showError('Failed to rescan page')
    } finally {
      setRescanning(false)
    }
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        onClick={handleRescan}
        disabled={rescanning}
        className={styles.rescanButton}
      >
        {rescanning ? 'Rescanning...' : 'Rescan'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={styles.deleteButton}
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
