'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PathTree from './PathTree'
import { getPagePath } from '@/lib/utils/slugify'
import styles from './ProjectAssetsList.module.css'

const PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_PAGE_SIZE = 50

interface AssetItem {
  src: string
  alt?: string
  pageId: string
  pageTitle: string | null
  pageUrl: string
  pageSlug: string | null
}

interface ProjectAssetsListProps {
  projectSlug: string
  projectName: string
  project: { id: string; slug?: string | null; baseUrl: string }
}

export default function ProjectAssetsList({
  projectSlug,
  projectName,
  project,
}: ProjectAssetsListProps) {
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pathFilter, setPathFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))
      if (search) params.set('q', search)
      if (pathFilter && pathFilter !== '/') params.set('path', pathFilter)
      const res = await fetch(`/api/projects/${projectSlug}/assets?${params}`)
      if (!res.ok) throw new Error('Failed to fetch assets')
      const data = await res.json()
      setAssets(data.assets || [])
      setTotal(data.total || 0)
    } catch {
      setAssets([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [projectSlug, page, pageSize, search, pathFilter])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

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

  const handlePathSelect = (path: string) => {
    setPathFilter(path === '/' ? '' : path)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const hasFilters = search || pathFilter

  const getFileExt = (src: string) => {
    try {
      const path = new URL(src).pathname
      const m = path.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
      return m ? m[1].toLowerCase() : ''
    } catch {
      return ''
    }
  }

  const isImage = (src: string) => {
    const ext = getFileExt(src)
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext)
  }

  return (
    <section id="assets" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Assets</h2>
        <p className={styles.subtitle}>
          Images and media from crawled pages in {projectName}
        </p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <PathTree
            projectSlug={projectSlug}
            selectedPath={pathFilter || '/'}
            onPathSelect={handlePathSelect}
          />
        </aside>

        <div className={styles.main}>
          <div className={styles.toolbar}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <input
                type="search"
                placeholder="Search by URL or alt text..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={styles.searchInput}
                aria-label="Search assets"
              />
              <button type="submit" className={styles.searchButton}>
                Search
              </button>
            </form>
            <div className={styles.filters}>
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
            <div className={styles.loading}>Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className={styles.empty}>
              <p>
                {hasFilters
                  ? 'No assets match your filters.'
                  : 'No images found on crawled pages yet.'}
              </p>
              {!hasFilters && (
                <Link
                  href={`/projects/${projectSlug}/crawl`}
                  className={styles.emptyButton}
                >
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
                      <th className={styles.thumbCol}>Preview</th>
                      <th>URL</th>
                      <th>Alt Text</th>
                      <th>Source Page</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a, i) => (
                      <tr key={`${a.src}-${a.pageId}-${i}`}>
                        <td className={styles.thumbCell}>
                          {isImage(a.src) ? (
                            <img
                              src={a.src}
                              alt={a.alt || ''}
                              className={styles.thumb}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  styles.hidden
                                )
                              }}
                            />
                          ) : null}
                          <span
                            className={`${styles.thumbPlaceholder} ${isImage(a.src) ? styles.hidden : ''}`}
                          >
                            📎
                          </span>
                        </td>
                        <td>
                          <a
                            href={a.src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.assetLink}
                            title={a.src}
                          >
                            {a.src.length > 80 ? a.src.slice(0, 77) + '…' : a.src}
                          </a>
                        </td>
                        <td>{a.alt || '—'}</td>
                        <td>
                          <Link
                            href={getPagePath(
                              project,
                              {
                                id: a.pageId,
                                slug: a.pageSlug,
                              }
                            )}
                            className={styles.pageLink}
                          >
                            {a.pageTitle || a.pageUrl || 'Untitled'}
                          </Link>
                        </td>
                        <td>
                          <a
                            href={a.src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.actionLink}
                          >
                            Open
                          </a>
                        </td>
                      </tr>
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
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
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
        </div>
      </div>
    </section>
  )
}
