'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageRow from './pages/PageRow'
import styles from './ProjectPagesList.module.css'

const PAGE_SIZE_OPTIONS = [10, 25, 50]
const DEFAULT_PAGE_SIZE = 10

interface PageItem {
  id: string
  url: string
  title: string | null
  status: string
  wordCount: number | null
  qualityScore: number | null
  detectedTopics: string[]
  crawledAt: string
  analyzedAt: string | null
}

interface ProjectPagesListProps {
  projectId: string
  projectName: string
}

export default function ProjectPagesList({
  projectId,
  projectName,
}: ProjectPagesListProps) {
  const [pages, setPages] = useState<PageItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetchPages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))
      if (search) params.set('q', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/projects/${projectId}/pages?${params}`)
      if (!res.ok) throw new Error('Failed to fetch pages')
      const data = await res.json()
      setPages(data.pages)
      setTotal(data.total)
    } catch {
      setPages([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [projectId, page, pageSize, search, statusFilter])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  // Debounce search input and reset to page 1 when search changes
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <section id="pages" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Pages</h2>
        <p className={styles.subtitle}>
          Crawled pages for {projectName}
        </p>
      </div>

      <div className={styles.toolbar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="search"
            placeholder="Search by title or URL..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
            aria-label="Search pages"
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>
        <div className={styles.filters}>
          <label htmlFor="status-filter" className={styles.filterLabel}>
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className={styles.statusSelect}
          >
            <option value="">All</option>
            <option value="crawled">Crawled</option>
            <option value="analyzed">Analyzed</option>
            <option value="failed">Failed</option>
          </select>
          <label htmlFor="page-size" className={styles.filterLabel}>
            Per page
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className={styles.pageSizeSelect}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading pages...</div>
      ) : pages.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {search || statusFilter
              ? 'No pages match your filters.'
              : 'No pages have been crawled yet.'}
          </p>
          {!search && !statusFilter && (
            <Link href={`/projects/${projectId}/crawl`} className={styles.emptyButton}>
              Start Crawl
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Word Count</th>
                  <th>Quality Score</th>
                  <th>Topics</th>
                  <th>Crawled</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <PageRow
                    key={p.id}
                    page={{
                      ...p,
                      crawledAt: p.crawledAt ? new Date(p.crawledAt) : new Date(0),
                    }}
                    projectId={projectId}
                    onAction={fetchPages}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {start}–{end} of {total}
            </div>
            <div className={styles.paginationControls}>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className={styles.pageButton}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className={styles.pageNumbers}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className={styles.pageButton}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
