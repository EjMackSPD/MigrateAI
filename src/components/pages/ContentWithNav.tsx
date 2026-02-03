'use client'

import { useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { slugify } from '@/lib/utils/slugify'
import styles from './ContentWithNav.module.css'

export interface NavHeading {
  level: 1 | 2
  text: string
  id: string
}

function parseHeadings(markdown: string): NavHeading[] {
  const headings: NavHeading[] = []
  const seen = new Set<string>()
  const lines = markdown.split('\n')
  for (const line of lines) {
    const m = line.match(/^(#{1,2})\s+(.+)$/)
    if (m) {
      const level = m[1].length as 1 | 2
      const text = m[2].trim()
      const base = slugify(text) || 'section'
      let id = base
      let n = 1
      while (seen.has(id)) {
        id = `${base}-${n++}`
      }
      seen.add(id)
      headings.push({ level, text, id })
    }
  }
  return headings
}

export default function ContentWithNav({
  content,
  fallbackContent,
  className,
}: {
  content: string
  fallbackContent?: string
  className?: string
}) {
  const headings = parseHeadings(content)
  const h1h2 = headings.filter((h) => h.level <= 2)

  if (!content && !fallbackContent) return null

  const markdown = content || fallbackContent || ''
  const hasNav = h1h2.length > 0

  return (
    <div className={`${styles.wrapper} ${className || ''}`}>
      {hasNav && (
        <nav className={styles.nav} aria-label="Content outline">
          <div className={styles.navTitle}>Jump to</div>
          <ul className={styles.navList}>
            {h1h2.map((h) => (
              <li
                key={h.id}
                className={styles.navItem}
                style={{ paddingLeft: h.level === 2 ? '1rem' : 0 }}
              >
                <a href={`#${h.id}`} className={styles.navLink}>
                  {h.level === 1 && <span className={styles.navH1}>H1</span>}
                  {h.level === 2 && <span className={styles.navH2}>H2</span>}
                  <span className={styles.navText}>{h.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className={styles.content}>
        {content ? (
          <ContentMarkdown
            content={markdown}
            headingIds={h1h2.map((x) => x.id)}
          />
        ) : (
          <div className={styles.contentText}>{fallbackContent}</div>
        )}
      </div>
    </div>
  )
}

function ContentMarkdown({
  content,
  headingIds,
}: {
  content: string
  headingIds: string[]
}) {
  const indexRef = useRef(0)

  const getId = () => {
    const id = headingIds[indexRef.current]
    indexRef.current++
    return id
  }

  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => {
          const id = getId()
          return (
            <h1 id={id} className={styles.mdH1}>
              <span className={styles.mdHeadingLabel}>H1</span>
              {children}
            </h1>
          )
        },
        h2: ({ children }) => {
          const id = getId()
          return (
            <h2 id={id} className={styles.mdH2}>
              <span className={styles.mdHeadingLabel}>H2</span>
              {children}
            </h2>
          )
        },
        h3: ({ children }) => (
          <h3 className={styles.mdH3}>
            <span className={styles.mdHeadingLabel}>H3</span>
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className={styles.mdH4}>
            <span className={styles.mdHeadingLabel}>H4</span>
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className={styles.mdH5}>
            <span className={styles.mdHeadingLabel}>H5</span>
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className={styles.mdH6}>
            <span className={styles.mdHeadingLabel}>H6</span>
            {children}
          </h6>
        ),
        p: ({ children }) => <p className={styles.mdP}>{children}</p>,
        ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
        ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
        li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className={styles.mdBlockquote}>{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className={styles.mdTableWrap}>
            <table className={styles.mdTable}>{children}</table>
          </div>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src || ''}
            alt={alt || ''}
            className={styles.mdImg}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
