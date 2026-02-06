'use client'

import { useState, useEffect } from 'react'
import styles from './PathTree.module.css'

export interface PathNode {
  path: string
  label: string
  pageCount: number
  children: PathNode[]
}

interface PathTreeProps {
  projectSlug: string
  selectedPath: string
  onPathSelect: (path: string) => void
}

export default function PathTree({
  projectSlug,
  selectedPath,
  onPathSelect,
}: PathTreeProps) {
  const [root, setRoot] = useState<PathNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['/']))

  useEffect(() => {
    fetch(`/api/projects/${projectSlug}/pages/paths`)
      .then((res) => res.json())
      .then((data) => {
        setRoot(data.paths || null)
        setLoading(false)
      })
      .catch(() => {
        setRoot(null)
        setLoading(false)
      })
  }, [projectSlug])

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const expandAll = () => {
    if (!root) return
    const all: Set<string> = new Set(['/'])
    const collect = (node: PathNode) => {
      all.add(node.path)
      node.children.forEach(collect)
    }
    root.children.forEach(collect)
    setExpanded(all)
  }

  const collapseAll = () => {
    setExpanded(new Set(['/']))
  }

  const renderNode = (node: PathNode, depth: number) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expanded.has(node.path)
    const isSelected = selectedPath === node.path

    return (
      <div key={node.path} className={styles.node}>
        <div
          className={`${styles.row} ${isSelected ? styles.selected : ''}`}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          <span
            className={`${styles.expandIcon} ${!hasChildren ? styles.leaf : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (hasChildren) toggle(node.path)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (hasChildren) toggle(node.path)
              }
            }}
            role={hasChildren ? 'button' : undefined}
            tabIndex={hasChildren ? 0 : undefined}
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            {hasChildren ? (isExpanded ? '▾' : '▸') : ' '}
          </span>
          <button
            type="button"
            className={styles.pathBtn}
            onClick={() => onPathSelect(node.path)}
          >
            <span className={styles.label}>{node.label}</span>
            <span className={styles.count}>{node.pageCount}</span>
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className={styles.children}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const hasSelection = selectedPath && selectedPath !== '/'

  if (loading) {
    return (
      <div className={styles.tree}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Filter by path</span>
        </div>
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden />
          Loading…
        </div>
      </div>
    )
  }

  if (!root || (root.children.length === 0 && root.pageCount === 0)) {
    return (
      <div className={styles.tree}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Filter by path</span>
        </div>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📁</span>
          <p>No pages crawled yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tree}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Filter by path</span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={expandAll}
            title="Expand all"
          >
            Expand
          </button>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={collapseAll}
            title="Collapse all"
          >
            Collapse
          </button>
        </div>
      </div>
      <div className={styles.content}>
        <button
          type="button"
          className={`${styles.row} ${styles.allRow} ${selectedPath === '/' ? styles.selected : ''}`}
          onClick={() => onPathSelect('/')}
        >
          <span className={styles.expandIcon}> </span>
          <span className={styles.label}>All pages</span>
          <span className={styles.count}>{root.pageCount}</span>
        </button>
        {root.children.map((child) => renderNode(child, 0))}
      </div>
      {hasSelection && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => onPathSelect('/')}
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  )
}
