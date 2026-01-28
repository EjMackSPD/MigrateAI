import { chromium, Browser, Page } from 'playwright'
import { createHash } from 'crypto'
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

export interface CrawledPage {
  url: string
  urlHash: string
  title: string | null
  metaDescription: string | null
  rawHtml: string
  extractedContent: string
  wordCount: number
  contentType: string | null
  links: string[]
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
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })

      // Wait for content to load
      await page.waitForTimeout(1000)

      const html = await page.content()
      const extracted = this.extractor.extract(html, url)

      // Extract links
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        return anchors
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => href && !href.startsWith('javascript:'))
      })

      const urlHash = createHash('sha256').update(url).digest('hex')

      return {
        url,
        urlHash,
        title: extracted.title,
        metaDescription: extracted.metaDescription,
        rawHtml: html,
        extractedContent: extracted.content,
        wordCount: extracted.wordCount,
        contentType: extracted.contentType,
        links: this.filterLinks(links, url, config),
        crawlDepth: 0, // Will be set by crawl manager
      }
    } finally {
      await page.close()
    }
  }

  private filterLinks(
    links: string[],
    baseUrl: string,
    config: CrawlConfig
  ): string[] {
    const base = new URL(baseUrl)
    const filtered = links.filter((link) => {
      try {
        const url = new URL(link)
        // Only include same-origin links
        if (url.origin !== base.origin) return false

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
        return false
      }
    })

    // Remove duplicates
    return Array.from(new Set(filtered))
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple pattern matching - supports * wildcard
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$'
    )
    return regex.test(path)
  }
}
