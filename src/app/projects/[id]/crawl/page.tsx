'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import styles from './Crawl.module.css'

export default function CrawlPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const [config, setConfig] = useState({
    maxPages: 100,
    maxDepth: 3,
    rateLimitMs: 1000,
    excludePatterns: ['/admin/*', '/login/*'],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)

  useEffect(() => {
    if (jobId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/jobs/${jobId}`)
          const data = await response.json()
          setJobStatus(data)
          if (data.status === 'completed') {
            clearInterval(interval)
            toast.showSuccess(`Crawl completed! Processed ${data.processedItems} pages.`)
          } else if (data.status === 'failed') {
            clearInterval(interval)
            toast.showError(`Crawl failed: ${data.errorMessage || 'Unknown error'}`)
          }
        } catch (err) {
          console.error('Error fetching job status:', err)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [jobId])

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
        setError(data.error || 'Failed to start crawl')
        toast.showError(data.error || 'Failed to start crawl')
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

        {error && <div className={styles.error}>{error}</div>}

        {jobStatus && (
          <div className={styles.jobStatus}>
            <h3>Job Status: {jobStatus.status}</h3>
            {jobStatus.progress > 0 && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>
            )}
            <p>
              Processed: {jobStatus.processedItems} / {jobStatus.totalItems || '?'}
            </p>
            {jobStatus.status === 'completed' && (
              <button
                onClick={() => router.push(`/projects/${projectId}/pages`)}
                className={styles.viewButton}
              >
                View Crawled Pages
              </button>
            )}
          </div>
        )}

        {!jobStatus && (
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
      </div>
    </MainLayout>
  )
}
