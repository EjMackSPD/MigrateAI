import { chromium, Browser, Page } from 'playwright'
import { createHash } from 'crypto'
import * as cheerio from 'cheerio'
import { ContentExtractor } from './extractor'

export interface CrawlConfig {
  baseUrl?: string
  maxPages?: number
  maxDepth?: number
  includePatterns?: string[]
  excludePatterns?: string[]
  respectRobots?: boolean
  rateLimitMs?: number
}

export interface CrawledLink {
  url: string
  anchorText?: string
}

export interface CrawledPage {
  url: string
  urlHash: string
  title: string | null
  metaDescription: string | null
  rawHtml: string
  extractedContent: string
  structuredContent: string
  wordCount: number
  contentType: string | null
  links: CrawledLink[]
  crawlDepth: number
}

export class CrawlerService {
  private browser: Browser | null = null
  private extractor: ContentExtractor

  constructor() {
    this.extractor = new ContentExtractor()
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      })
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async crawlPage(
    url: string,
    config: CrawlConfig = {}
  ): Promise<CrawledPage> {
    if (!this.browser) {
      await this.initialize()
    }

    const page = await this.browser!.newPage()
    
    // Set a longer navigation timeout
    page.setDefaultNavigationTimeout(60000) // 60 seconds
    page.setDefaultTimeout(60000)
    
    try {
      // Try to load the page with a more lenient wait condition
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded', // More lenient than 'networkidle'
          timeout: 60000, // 60 seconds
        })
      } catch (navError) {
        // If navigation times out, try to get whatever content is available
        console.warn(`Navigation timeout for ${url}, attempting to extract partial content`)
        // Page might have partially loaded, continue anyway
      }

      // Wait a bit for dynamic content, but don't fail if it takes too long
      try {
        await page.waitForTimeout(2000) // Wait 2 seconds for dynamic content
      } catch {
        // Timeout is fine, continue with what we have
      }

      const html = await page.content()
      const extracted = this.extractor.extract(html, url)

      // Extract links with anchor text
      let links: CrawledLink[] = []
      try {
        links = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'))
          return anchors
            .map((a) => {
              const el = a as HTMLAnchorElement
              const href = el.href
              if (!href || href.startsWith('javascript:')) return null
              const anchorText = el.textContent?.trim().slice(0, 500) || undefined
              return { url: href, anchorText: anchorText || undefined }
            })
            .filter((x): x is { url: string; anchorText?: string } => x !== null)
        })
      } catch (evalError) {
        console.warn(`Could not extract links from ${url}, continuing with empty links`)
        links = []
      }

      const filteredUrls = this.filterLinks(
        links.map((l) => l.url),
        normalizedUrl,
        config
      )
      const urlSet = new Set(filteredUrls)
      const seen = new Set<string>()
      links = links
        .filter((l) => {
          const norm = this.normalizeUrl(l.url)
          if (!urlSet.has(norm)) return false
          if (seen.has(norm)) return false
          seen.add(norm)
          return true
        })
        .map((l) => ({ url: this.normalizeUrl(l.url), anchorText: l.anchorText }))

      // Normalize URL (strip query string and hash) for consistent hashing
      const normalizedUrl = this.normalizeUrl(url)
      const urlHash = createHash('sha256').update(normalizedUrl).digest('hex')

      return {
        url: normalizedUrl, // Store canonical URL (no query or hash)
        urlHash,
        title: extracted.title,
        metaDescription: extracted.metaDescription,
        rawHtml: html,
        extractedContent: extracted.content,
        structuredContent: extracted.structuredContent,
        wordCount: extracted.wordCount,
        contentType: extracted.contentType,
        links,
        crawlDepth: 0, // Will be set by crawl manager
      }
    } catch (error) {
      // Close page even on error
      await page.close()
      
      // Re-throw with more context
      if (error instanceof Error) {
        if (error.message.includes('Timeout')) {
          throw new Error(`Timeout loading ${url}: Page took too long to load`)
        } else if (error.message.includes('net::ERR')) {
          throw new Error(`Network error loading ${url}: ${error.message}`)
        }
      }
      throw error
    } finally {
      // Ensure page is closed
      try {
        await page.close()
      } catch {
        // Page might already be closed
      }
    }
  }

  /**
   * Normalize URL by removing hash fragment and query string.
   * Same path with different ? or # is treated as one page (no rescan).
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      urlObj.hash = ''
      urlObj.search = ''
      return urlObj.toString()
    } catch {
      let out = url
      const q = out.indexOf('?')
      if (q !== -1) out = out.substring(0, q)
      const h = out.indexOf('#')
      if (h !== -1) out = out.substring(0, h)
      return out
    }
  }

  /**
   * Check if a URL is just a hash fragment (anchor link to same page)
   */
  private isHashOnlyUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      // If pathname is empty or just '/', and there's a hash, it's a hash-only link
      return (urlObj.pathname === '' || urlObj.pathname === '/') && urlObj.hash.length > 0
    } catch {
      // Relative URLs starting with # are hash-only
      return url.trim().startsWith('#')
    }
  }

  /**
   * Extract links from stored HTML (e.g. for pages we've already crawled).
   * Used to continue BFS when skipping re-crawl of existing pages.
   */
  extractLinksFromHtml(
    html: string,
    pageUrl: string,
    config: CrawlConfig
  ): string[] {
    const $ = cheerio.load(html)
    const links: string[] = []
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href && !href.trim().startsWith('javascript:')) {
        try {
          links.push(new URL(href, pageUrl).href)
        } catch {
          // Invalid URL, skip
        }
      }
    })
    return this.filterLinks(links, pageUrl, config)
  }

  private filterLinks(
    links: string[],
    baseUrl: string,
    config: CrawlConfig
  ): string[] {
    const base = new URL(baseUrl)
    const normalizedBase = this.normalizeUrl(baseUrl)
    
    const filtered = links.filter((link) => {
      try {
        // Skip hash-only URLs (anchor links to same page sections)
        if (this.isHashOnlyUrl(link)) {
          return false
        }

        const url = new URL(link)
        
        // Normalize URL by removing hash fragment
        const normalizedLink = this.normalizeUrl(link)
        
        // Only include same-origin links
        if (url.origin !== base.origin) return false

        // Skip if normalized link is the same as normalized base (same page, different hash)
        if (normalizedLink === normalizedBase) return false

        // Check include patterns
        if (config.includePatterns?.length) {
          const matches = config.includePatterns.some((pattern) =>
            this.matchesPattern(url.pathname, pattern)
          )
          if (!matches) return false
        }

        // Check exclude patterns
        if (config.excludePatterns?.length) {
          const matches = config.excludePatterns.some((pattern) =>
            this.matchesPattern(url.pathname, pattern)
          )
          if (matches) return false
        }

        return true
      } catch {
        // If URL parsing fails, check if it's a relative hash link
        if (link.trim().startsWith('#')) {
          return false
        }
        return false
      }
    })

    // Normalize all links, remove duplicates, and return normalized URLs
    const normalized = filtered.map((link) => this.normalizeUrl(link))
    return Array.from(new Set(normalized))
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - supports * wildcard
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$'
    )
    return regex.test(path)
  }
}
