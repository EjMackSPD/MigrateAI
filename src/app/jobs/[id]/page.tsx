'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import styles from './JobDetail.module.css'

interface Job {
  id: string
  jobType: string
  status: string
  progress: number
  totalItems: number | null
  processedItems: number
  errorMessage: string | null
  metadata: Record<string, any>
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  project: {
    id: string
    name: string
  } | null
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [pausing, setPausing] = useState(false)

  useEffect(() => {
    fetchJob()
    // Poll for updates if job is running or pending
    if (job && (job.status === 'running' || job.status === 'pending')) {
      const interval = setInterval(fetchJob, 2000)
      return () => clearInterval(interval)
    }
  }, [jobId, job?.status])

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (!response.ok) throw new Error('Failed to fetch job')
      const data = await response.json()
      setJob(data)
    } catch (err) {
      console.error('Error fetching job:', err)
      toast.showError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this job?')) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel job')
      }

      const updated = await response.json()
      setJob(updated)
      toast.showSuccess('Job cancelled successfully')
      // Refresh after a moment
      setTimeout(fetchJob, 1000)
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to cancel job')
    } finally {
      setCancelling(false)
    }
  }

  const handlePause = async () => {
    setPausing(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to pause job')
      }

      const updated = await response.json()
      setJob(updated)
      toast.showSuccess(updated.message || 'Pause requested')
      fetchJob()
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to pause job')
    } finally {
      setPausing(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Loading job details...</div>
        </div>
      </MainLayout>
    )
  }

  if (!job) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.error}>Job not found</div>
        </div>
      </MainLayout>
    )
  }

  const getJobIcon = () => {
    switch (job.jobType) {
      case 'crawl':
        return '🔗'
      case 'analyze':
        return '🔎'
      case 'match':
        return '🔗'
      case 'generate':
        return '📝'
      default:
        return '📄'
    }
  }

  const canCancel = job.status === 'pending' || job.status === 'running'
  const canPause = job.status === 'running'

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/jobs" className={styles.backLink}>
            ← Back to Jobs
          </Link>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              {getJobIcon()} {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)} Job
            </h1>
            {job.project && (
              <Link href={`/projects/${job.project.id}`} className={styles.projectLink}>
                Project: {job.project.name}
              </Link>
            )}
          </div>
        </div>

        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <div>
              <h2 className={styles.statusTitle}>Status</h2>
              <span className={`${styles.statusBadge} ${styles[job.status]}`}>
                {job.status}
              </span>
            </div>
            {(canCancel || canPause) && (
              <div className={styles.actions}>
                {canPause && (
                  <button
                    onClick={handlePause}
                    disabled={pausing}
                    className={styles.pauseButton}
                  >
                    {pausing ? 'Pausing...' : '⏸️ Pause'}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className={styles.cancelButton}
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            )}
          </div>

          {job.metadata?.statusMessage && (
            <div className={styles.statusMessage}>
              {job.metadata.statusMessage}
            </div>
          )}

          {job.progress > 0 && (
            <div className={styles.progressSection}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className={styles.progressText}>
                <span>{job.progress}%</span>
                <span>
                  {job.processedItems} / {job.totalItems || '?'} items processed
                </span>
              </div>
            </div>
          )}

          {job.status === 'running' && job.metadata && (
            <div className={styles.details}>
              {job.metadata.currentUrl && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Current Page:</span>
                  <span className={styles.detailValue}>{job.metadata.currentUrl}</span>
                </div>
              )}
              {job.metadata.depth !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Depth:</span>
                  <span className={styles.detailValue}>{job.metadata.depth}</span>
                </div>
              )}
              {job.metadata.queueSize !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Queue:</span>
                  <span className={styles.detailValue}>{job.metadata.queueSize} pages</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>Job Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Job Type:</span>
              <span className={styles.infoValue}>{job.jobType}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Created:</span>
              <span className={styles.infoValue}>
                {new Date(job.createdAt).toLocaleString()}
              </span>
            </div>
            {job.startedAt && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Started:</span>
                <span className={styles.infoValue}>
                  {new Date(job.startedAt).toLocaleString()}
                </span>
              </div>
            )}
            {job.completedAt && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Completed:</span>
                <span className={styles.infoValue}>
                  {new Date(job.completedAt).toLocaleString()}
                </span>
              </div>
            )}
            {job.startedAt && job.completedAt && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Duration:</span>
                <span className={styles.infoValue}>
                  {Math.round(
                    (new Date(job.completedAt).getTime() -
                      new Date(job.startedAt).getTime()) /
                      1000
                  )}{' '}
                  seconds
                </span>
              </div>
            )}
          </div>
        </div>

        {job.errorMessage && (
          <div className={styles.errorCard}>
            <h3 className={styles.cardTitle}>Error</h3>
            <p className={styles.errorText}>{job.errorMessage}</p>
          </div>
        )}

        {job.metadata && Object.keys(job.metadata).length > 0 && (
          <div className={styles.metadataCard}>
            <h3 className={styles.cardTitle}>Metadata</h3>
            <pre className={styles.metadataContent}>
              {JSON.stringify(job.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
