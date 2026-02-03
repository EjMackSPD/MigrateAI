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
  const projectSlug = params.slug as string
  const jobFromUrl = searchParams.get('job')
  const [config, setConfig] = useState({
    maxPages: 100,
    maxDepth: 3,
    rateLimitMs: 1000,
    excludePatterns: ['/admin/*', '/login/*'],
  })
  const [loading, setLoading] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState<string | null>(jobFromUrl)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const [workerHealth, setWorkerHealth] = useState<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    redis: string
    queues: string
    queuesDetail?: Record<string, { waiting: number; active: number; completed: number; failed: number }>
    message?: string
  } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingWarningShownRef = useRef(false)

  useEffect(() => {
    if (jobFromUrl && !jobId) setJobId(jobFromUrl)
  }, [jobFromUrl, jobId])

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health/workers')
        const data = await res.json()
        setWorkerHealth(data)
      } catch {
        setWorkerHealth({
          status: 'unhealthy',
          redis: 'error',
          queues: 'n/a',
          message: 'Failed to fetch worker health',
        })
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 10000)
    return () => clearInterval(interval)
  }, [])

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
      const response = await fetch(`/api/projects/${projectSlug}/crawl`, {
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

  const handleStopCrawl = async () => {
    if (!jobId) return
    setStopping(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.showError(data.error || 'Failed to stop crawl')
        return
      }
      toast.showSuccess('Crawl stopped')
      setJobStatus(data)
    } catch (err) {
      toast.showError('Failed to stop crawl')
    } finally {
      setStopping(false)
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
          <strong>Crawl requires:</strong> Redis running, <code>REDIS_URL</code> in .env.local, workers (<code>npm run workers</code>), and Playwright browser (<code>npm run setup:playwright</code>). Status updates appear on this page.
        </div>

        {workerHealth && (
          <div
            className={`${styles.healthCard} ${styles[`health_${workerHealth.status}`]}`}
            title={
              [
                `Redis: ${workerHealth.redis}`,
                `Queues: ${workerHealth.queues}`,
                workerHealth.queuesDetail &&
                  Object.entries(workerHealth.queuesDetail)
                    .map(
                      ([name, c]) =>
                        `${name}: waiting=${c.waiting}, active=${c.active}, completed=${c.completed}, failed=${c.failed}`
                    )
                    .join(' | '),
                workerHealth.message,
              ]
                .filter(Boolean)
                .join('\n')
            }
          >
            <div className={styles.healthHeader}>
              <span className={styles.healthLabel}>Background workers</span>
              <span className={styles.healthStatus}>
                {workerHealth.status === 'healthy' && '✓ Ready'}
                {workerHealth.status === 'degraded' && '⚠ Partially ready'}
                {workerHealth.status === 'unhealthy' && '✗ Not ready'}
              </span>
            </div>
            <p className={styles.healthMessage}>
              {workerHealth.status === 'healthy' &&
                'Crawl jobs can run. Make sure workers are running in a separate terminal (npm run workers).'}
              {workerHealth.status === 'degraded' &&
                'Some services may not be available. Hover for details.'}
              {workerHealth.status === 'unhealthy' &&
                (workerHealth.message?.includes('REDIS_URL')
                  ? 'Redis is not configured. Add REDIS_URL to .env.local.'
                  : 'Cannot connect to background services. Check that Redis is running and REDIS_URL is set.')}
            </p>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {jobStatus && (
          <div className={styles.jobStatus}>
            <div className={styles.statusHeader}>
              <h3 className={styles.statusTitle}>
                {jobStatus.status === 'running' && 'Crawling in Progress'}
                {jobStatus.status === 'completed' && 'Crawl Complete'}
                {jobStatus.status === 'failed' && (jobStatus.errorMessage === 'Cancelled by user' ? 'Crawl Stopped' : 'Crawl Failed')}
                {jobStatus.status === 'pending' && 'Waiting to Start...'}
              </h3>
              <div className={styles.statusHeaderActions}>
                {(jobStatus.status === 'running' || jobStatus.status === 'pending') && (
                  <button
                    type="button"
                    onClick={handleStopCrawl}
                    disabled={stopping}
                    className={styles.stopButton}
                  >
                    {stopping ? 'Stopping...' : 'Stop Crawl'}
                  </button>
                )}
                <div className={styles.statusBadge}>
                  {jobStatus.status}
                </div>
              </div>
            </div>

            {(jobStatus.metadata?.statusMessage || jobStatus.status === 'pending') && (
              <div className={styles.statusMessage}>
                {jobStatus.status === 'pending'
                  ? 'Waiting for a worker to start. Run "npm run workers" in a separate terminal (or use the Debug Full Stack profile).'
                  : jobStatus.metadata.statusMessage}
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

            {(jobStatus.status === 'running' || jobStatus.status === 'pending') && (
              <div className={styles.progressSection}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${jobStatus.progress || 0}%` }}
                  />
                </div>
                <div className={styles.progressText}>
                  <span>{jobStatus.progress || 0}%</span>
                  <span>
                    {jobStatus.processedItems ?? 0} / {jobStatus.totalItems ?? jobStatus.metadata?.config?.maxPages ?? '?'} pages
                  </span>
                </div>
              </div>
            )}

            {(jobStatus.status === 'completed' || (jobStatus.status === 'failed' && jobStatus.errorMessage === 'Cancelled by user')) && (
              <div className={styles.completedActions}>
                {(jobStatus.processedItems ?? 0) > 0 && (
                  <button
                    onClick={() => router.push(`/projects/${projectSlug}#pages`)}
                    className={styles.viewButton}
                  >
                    📄 View Crawled Pages
                  </button>
                )}
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
              <div className={jobStatus.errorMessage === 'Cancelled by user' ? styles.cancelledMessage : styles.errorMessage}>
                {jobStatus.errorMessage === 'Cancelled by user' ? (
                  <>Crawl was stopped. Pages crawled before stopping have been saved.</>
                ) : (
                  <>
                    <strong>Error:</strong> {jobStatus.errorMessage}
                    {Array.isArray(jobStatus.metadata?.errors) && jobStatus.metadata.errors.length > 1 && (
                      <details className={styles.errorDetails}>
                        <summary>Show all {jobStatus.metadata.errors.length} errors</summary>
                        <ul>
                          {jobStatus.metadata.errors.slice(0, 10).map((e: { url?: string; error?: string }, i: number) => (
                            <li key={i}>{e.url || 'Unknown'}: {e.error || ''}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </>
                )}
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
