'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './ProjectRedirectsList.module.css'

interface RedirectItem {
  id: string
  sourceUrl: string
  sourceTitle: string | null
  targetType: string
  targetUrl: string | null
  notes: string | null
  createdAt: string
}

interface ProjectRedirectsListProps {
  projectSlug: string
  projectName: string
}

export default function ProjectRedirectsList({
  projectSlug,
  projectName,
}: ProjectRedirectsListProps) {
  const [redirects, setRedirects] = useState<RedirectItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRedirects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectSlug}/redirects`)
      if (res.ok) {
        const data = await res.json()
        setRedirects(data.redirects ?? [])
      } else {
        setRedirects([])
      }
    } catch {
      setRedirects([])
    } finally {
      setLoading(false)
    }
  }, [projectSlug])

  useEffect(() => {
    fetchRedirects()
  }, [fetchRedirects])

  const exportCsv = () => {
    const header = 'Source URL,Target URL,Source Title,Target Type,Notes\n'
    const rows = redirects.map((r) => {
      const source = `"${(r.sourceUrl || '').replace(/"/g, '""')}"`
      const target = `"${(r.targetUrl || '').replace(/"/g, '""')}"`
      const sourceTitle = `"${(r.sourceTitle || '').replace(/"/g, '""')}"`
      const targetType = `"${r.targetType}"`
      const notes = `"${(r.notes || '').replace(/"/g, '""')}"`
      return [source, target, sourceTitle, targetType, notes].join(',')
    })
    const csv = header + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}-redirects.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <section id="redirects" className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>Redirect list</h2>
          <p className={styles.subtitle}>Loading…</p>
        </div>
      </section>
    )
  }

  if (redirects.length === 0) {
    return (
      <section id="redirects" className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>Redirect list</h2>
          <p className={styles.subtitle}>
            Archived pages with redirects for {projectName}. Archive pages from
            the page detail view to add entries.
          </p>
        </div>
        <div className={styles.empty}>No redirects yet.</div>
      </section>
    )
  }

  return (
    <section id="redirects" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Redirect list</h2>
        <p className={styles.subtitle}>
          {redirects.length} redirect{redirects.length !== 1 ? 's' : ''} from
          archived pages.
        </p>
        <button
          type="button"
          onClick={exportCsv}
          className={styles.exportButton}
        >
          Export CSV
        </button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Source URL</th>
              <th>Target</th>
              <th>Type</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {redirects.map((r) => (
              <tr key={r.id}>
                <td className={styles.sourceCell} title={r.sourceUrl}>
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.urlLink}
                  >
                    {r.sourceUrl.length > 60
                      ? r.sourceUrl.slice(0, 60) + '…'
                      : r.sourceUrl}
                  </a>
                </td>
                <td className={styles.targetCell}>
                  {r.targetUrl ? (
                    <a
                      href={r.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.urlLink}
                    >
                      {r.targetUrl.length > 50
                        ? r.targetUrl.slice(0, 50) + '…'
                        : r.targetUrl}
                    </a>
                  ) : (
                    <span className={styles.placeholder}>
                      [Placeholder – update later]
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={`${styles.badge} ${
                      r.targetType === 'placeholder' ? styles.badgePlaceholder : ''
                    }`}
                  >
                    {r.targetType}
                  </span>
                </td>
                <td className={styles.notesCell}>{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
