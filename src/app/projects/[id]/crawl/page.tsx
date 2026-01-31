'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import styles from './Crawl.module.css'

export default function CrawlPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const projectId = params.id as string
  const jobFromUrl = searchParams.get('job')
  const [config, setConfig] = useState({
    maxPages: 100,
    maxDepth: 3,
    rateLimitMs: 1000,
    excludePatterns: ['/admin/*', '/login/*'],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState<string | null>(jobFromUrl)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingWarningShownRef = useRef(false)

  useEffect(() => {
    if (jobFromUrl && !jobId) setJobId(jobFromUrl)
  }, [jobFromUrl, jobId])

  useEffect(() => {
    if (!jobId) return
    pendingWarningShownRef.current = false

    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        const data = await response.json()
        setJobStatus(data)

        if (data.status === 'pending' && data.createdAt) {
          const createdAt = new Date(data.createdAt)
          const now = new Date()
          const secondsPending = (now.getTime() - createdAt.getTime()) / 1000
          if (secondsPending > 30 && !pendingWarningShownRef.current) {
            pendingWarningShownRef.current = true
            toast.showError(
              'Job is stuck in pending. Make sure workers are running! Run "npm run workers" in a separate terminal.',
              { duration: 10000 }
            )
          }
        }

        if (data.status === 'completed' || data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch (err) {
        console.error('Error fetching job status:', err)
      }
    }

    fetchJob()
    pollRef.current = setInterval(fetchJob, 1500)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [jobId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.error || 'Failed to start crawl'
        const withDetails = data.details ? `${message} (${data.details})` : message
        setError(withDetails)
        toast.showError(message)
        return
      }

      toast.showSuccess('Crawl job started successfully!')
      setJobId(data.jobId)
    } catch (err) {
      setError('An error occurred. Please try again.')
      toast.showError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'maxPages' || name === 'maxDepth' || name === 'rateLimitMs') {
      setConfig({ ...config, [name]: parseInt(value) || 0 })
    } else if (name === 'excludePatterns') {
      setConfig({
        ...config,
        excludePatterns: value.split('\n').filter((p) => p.trim()),
      })
    } else {
      setConfig({ ...config, [name]: value })
    }
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Start Crawl</h1>

        <div className={styles.setupHint}>
          <strong>Crawl requires:</strong> Redis running (e.g. <code>docker run -p 6379:6379 redis</code>), <code>REDIS_URL</code> in .env.local, and workers in a separate terminal: <code>npm run workers</code>. Status updates appear on this page.
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {jobStatus && (
          <div className={styles.jobStatus}>
            <div className={styles.statusHeader}>
              <h3 className={styles.statusTitle}>
                {jobStatus.status === 'running' && 'Crawling in Progress'}
                {jobStatus.status === 'completed' && 'Crawl Complete'}
                {jobStatus.status === 'failed' && 'Crawl Failed'}
                {jobStatus.status === 'pending' && 'Waiting to Start...'}
              </h3>
              <div className={styles.statusBadge}>
                {jobStatus.status}
              </div>
            </div>

            {jobStatus.metadata?.statusMessage && (
              <div className={styles.statusMessage}>
                {jobStatus.metadata.statusMessage}
              </div>
            )}

            {jobStatus.status === 'running' && jobStatus.metadata?.currentUrl && (
              <div className={styles.currentlyScanning}>
                <span className={styles.scanSpinner} aria-hidden />
                <span className={styles.scanLabel}>Currently scanning:</span>
                <span className={styles.scanUrl} title={jobStatus.metadata.currentUrl}>
                  {jobStatus.metadata.currentUrl}
                </span>
              </div>
            )}

            {(jobStatus.status === 'running' || jobStatus.status === 'completed') &&
              (jobStatus.processedItems > 0 || (jobStatus.metadata?.totalLinksDiscovered ?? 0) > 0) && (
              <div className={styles.summaryStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{jobStatus.processedItems ?? 0}</span>
                  <span className={styles.statLabel}>Pages scanned</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{jobStatus.metadata?.totalLinksDiscovered ?? 0}</span>
                  <span className={styles.statLabel}>Links discovered</span>
                </div>
                {jobStatus.metadata?.queueSize !== undefined && jobStatus.status === 'running' && (
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{jobStatus.metadata.queueSize}</span>
                    <span className={styles.statLabel}>In queue</span>
                  </div>
                )}
              </div>
            )}

            {jobStatus.status === 'running' && jobStatus.metadata && (
              <div className={styles.statusDetails}>
                {jobStatus.metadata.depth !== undefined && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Depth:</span>
                    <span className={styles.detailValue}>{jobStatus.metadata.depth}</span>
                  </div>
                )}
                {jobStatus.metadata.queueSize !== undefined && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Queue:</span>
                    <span className={styles.detailValue}>{jobStatus.metadata.queueSize} pages</span>
                  </div>
                )}
                {jobStatus.metadata.linksFound !== undefined && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Links on last page:</span>
                    <span className={styles.detailValue}>{jobStatus.metadata.linksFound}</span>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(jobStatus.metadata?.scannedPages) && jobStatus.metadata.scannedPages.length > 0 && (
              <div className={styles.scanLog}>
                <h4 className={styles.scanLogTitle}>Pages scanned (most recent first)</h4>
                <div className={styles.scanLogList}>
                  {jobStatus.metadata.scannedPages.map((entry: { title: string; url: string; wordCount: number; linksCount: number; depth: number }, i: number) => (
                    <div key={`${entry.url}-${i}`} className={styles.scanLogEntry}>
                      <div className={styles.scanLogEntryTitle}>{entry.title || 'Untitled'}</div>
                      <div className={styles.scanLogEntryUrl} title={entry.url}>{entry.url}</div>
                      <div className={styles.scanLogEntryMeta}>
                        <span>{entry.wordCount} words</span>
                        <span>·</span>
                        <span>{entry.linksCount} links</span>
                        <span>·</span>
                        <span>depth {entry.depth}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jobStatus.progress > 0 && (
              <div className={styles.progressSection}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
                <div className={styles.progressText}>
                  <span>{jobStatus.progress}%</span>
                  <span>
                    {jobStatus.processedItems} / {jobStatus.totalItems || '?'} pages
                  </span>
                </div>
              </div>
            )}

            {jobStatus.status === 'completed' && (
              <div className={styles.completedActions}>
                <button
                  onClick={() => router.push(`/projects/${projectId}#pages`)}
                  className={styles.viewButton}
                >
                  📄 View Crawled Pages
                </button>
                <button
                  onClick={() => {
                    setJobStatus(null)
                    setJobId(null)
                  }}
                  className={styles.newCrawlButton}
                >
                  Start New Crawl
                </button>
              </div>
            )}

            {jobStatus.status === 'failed' && jobStatus.errorMessage && (
              <div className={styles.errorMessage}>
                <strong>Error:</strong> {jobStatus.errorMessage}
              </div>
            )}
          </div>
        )}

        {!jobStatus && !jobId && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="maxPages">Max Pages</label>
              <input
                id="maxPages"
                name="maxPages"
                type="number"
                value={config.maxPages}
                onChange={handleChange}
                min="1"
                max="10000"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="maxDepth">Max Depth</label>
              <input
                id="maxDepth"
                name="maxDepth"
                type="number"
                value={config.maxDepth}
                onChange={handleChange}
                min="1"
                max="10"
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rateLimitMs">Rate Limit (ms)</label>
              <input
                id="rateLimitMs"
                name="rateLimitMs"
                type="number"
                value={config.rateLimitMs}
                onChange={handleChange}
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="excludePatterns">
                Exclude Patterns (one per line)
              </label>
              <textarea
                id="excludePatterns"
                name="excludePatterns"
                value={config.excludePatterns.join('\n')}
                onChange={handleChange}
                rows={4}
                disabled={loading}
                placeholder="/admin/*&#10;/login/*"
              />
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => router.back()}
                className={styles.cancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Starting...' : 'Start Crawl'}
              </button>
            </div>
          </form>
        )}

        {jobId && !jobStatus && (
          <div className={styles.loading}>Loading job status...</div>
        )}
      </div>
    </MainLayout>
  )
}
