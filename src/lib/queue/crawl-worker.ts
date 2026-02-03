import { createHash } from 'crypto'
import { Job } from 'bullmq'
import { createWorker } from './index'
import { CrawlerService, CrawlConfig } from '@/lib/services/crawler'
import { prisma, withRetry } from '@/lib/db'
import { slugify } from '@/lib/utils/slugify'

/**
 * Normalize URL by removing hash and query string.
 * Same path with different ? or # is one page (no rescan).
 */
function normalizeUrl(url: string): string {
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

function getUrlHash(normalizedUrl: string): string {
  return createHash('sha256').update(normalizedUrl).digest('hex')
}

function pageSlugFromTitleOrUrl(title: string | null, url: string): string {
  let base = slugify(title || '')
  if (!base || base === 'project') {
    try {
      const path = new URL(url).pathname
      base = slugify(path.replace(/^\//, '').replace(/\/$/, '') || 'page')
    } catch {
      base = 'page'
    }
  }
  return base.slice(0, 180)
}

async function ensureUniquePageSlug(
  projectId: string,
  baseSlug: string,
  excludePageId?: string
): Promise<string> {
  let slug = baseSlug
  let n = 0
  for (;;) {
    const existing = await prisma.page.findFirst({
      where: {
        projectId,
        slug,
        ...(excludePageId ? { id: { not: excludePageId } } : {}),
      },
    })
    if (!existing) return slug
    n++
    slug = `${baseSlug}-${n}`
  }
}

interface CrawlJobData {
  projectId: string
  config: CrawlConfig
}

export const crawlWorker = createWorker('crawl', async (job: Job<CrawlJobData>) => {
  console.log(`\n========================================`)
  console.log(`Crawl worker: Starting job ${job.id}`)
  console.log(`========================================`)
  // Ensure DB connection is active (avoids "Closed" errors after long runs or idle)
  await prisma.$connect()
  const { projectId, config } = job.data
  if (!config?.baseUrl?.trim()) {
    const msg = 'Crawl job has no base URL. Edit the project and set a valid website URL.'
    console.error(msg)
    await withRetry(() =>
      prisma.job.update({
        where: { id: job.id! },
        data: {
          status: 'failed',
          errorMessage: msg,
          completedAt: new Date(),
        },
      })
    )
    throw new Error(msg)
  }
  console.log(`Project ID: ${projectId}`)
  console.log(`Base URL: ${config.baseUrl}`)
  console.log(`Max Pages: ${config.maxPages || 100}`)
  console.log(`Max Depth: ${config.maxDepth || 5}`)
  console.log(`Started at: ${new Date().toISOString()}`)
  const crawler = new CrawlerService()

  try {
    console.log(`Crawl worker: Processing job ${job.id} for project ${projectId}`)
    console.log(`Crawl worker: Base URL: ${config.baseUrl}`)
    
    // Status messages based on progress
    const getStatusMessage = (processed: number, total: number, currentUrl: string): string => {
      const percentage = Math.round((processed / total) * 100)
      
      if (processed === 0) {
        return 'Initializing crawler...'
      } else if (processed === 1) {
        return `First page crawled: ${currentUrl.substring(0, 50)}...`
      } else if (percentage < 10) {
        return `Crawling in progress... ${processed} pages discovered`
      } else if (percentage < 25) {
        return `Exploring site structure... ${processed} pages processed`
      } else if (percentage < 50) {
        return `Gathering content... ${processed} pages collected`
      } else if (percentage < 75) {
        return `Progress: ${processed} pages crawled (${percentage}% complete)`
      } else if (percentage < 90) {
        return `Nearly complete... ${processed} pages processed`
      } else if (percentage < 100) {
        return `Finalizing crawl... ${processed} pages processed`
      } else {
        return `Crawl complete: Successfully processed ${processed} pages`
      }
    }

    await crawler.initialize()

    const maxPages = config.maxPages || 100

    // Update job status with initial fun message
    await withRetry(() =>
      prisma.job.update({
        where: { id: job.id! },
        data: { 
          status: 'running', 
          startedAt: new Date(),
          totalItems: maxPages,
          metadata: {
            statusMessage: 'Initializing crawler...',
            currentUrl: config.baseUrl || '',
          },
        },
      })
    )

    // Normalize base URL to remove any hash fragments
    const normalizedBaseUrl = normalizeUrl(config.baseUrl || '')
    const visited = new Set<string>()
    const toVisit: Array<{ url: string; depth: number }> = [
      { url: normalizedBaseUrl, depth: 0 },
    ]

    let processed = 0
    const maxDepth = config.maxDepth || 5
    let lastStatusUpdate = 0
    const statusUpdateInterval = 2 // Update status every 2 pages

    while (toVisit.length > 0 && processed < maxPages) {
      // Check if job was cancelled or pause requested
      const currentJob = await withRetry(() =>
        prisma.job.findUnique({
          where: { id: job.id! },
          select: { status: true, metadata: true, errorMessage: true },
        })
      )

      if (!currentJob) {
        console.log('Job not found, stopping')
        break
      }

      if (currentJob.status === 'failed' && currentJob.errorMessage === 'Cancelled by user') {
        console.log('Job cancelled by user, stopping')
        await crawler.close()
        return { processed, total: processed, cancelled: true }
      }

      // Check for pause request
      const metadata = currentJob.metadata as Record<string, any>
      if (metadata?.pauseRequested) {
        console.log('Pause requested, pausing job...')
        await withRetry(() =>
          prisma.job.update({
            where: { id: job.id! },
            data: {
              metadata: {
                ...metadata,
                paused: true,
                pausedAt: new Date().toISOString(),
              },
            },
          })
        )
        // Wait until resume (for now, just mark as paused)
        // In a full implementation, you'd wait for a resume signal
        await crawler.close()
        return { processed, total: processed, paused: true }
      }

      const { url, depth } = toVisit.shift()!

      // Normalize URL (strip query string and hash) for dedup
      const normalizedUrl = normalizeUrl(url)
      
      if (visited.has(normalizedUrl) || depth > maxDepth) continue
      visited.add(normalizedUrl)

      // Do not rescan: skip if we already have this page for this project.
      // But we must still discover links from it for BFS - extract from stored rawHtml.
      const urlHash = getUrlHash(normalizedUrl)
      const existingPage = await withRetry(() =>
        prisma.page.findUnique({
          where: {
            projectId_urlHash: { projectId, urlHash },
          },
          select: { id: true, rawHtml: true, url: true },
        })
      )
      if (existingPage) {
        const hasUsableHtml = existingPage.rawHtml && existingPage.rawHtml.trim().length > 0
        let addedLinks = 0
        if (hasUsableHtml && depth < maxDepth) {
          const links = crawler.extractLinksFromHtml(
            existingPage.rawHtml!,
            existingPage.url,
            config
          )
          for (const link of links) {
            const normalizedLink = normalizeUrl(link)
            if (!visited.has(normalizedLink)) {
              toVisit.push({ url: normalizedLink, depth: depth + 1 })
              addedLinks++
            }
          }
        }
        // Skip crawling only when we have usable HTML and discovered new links.
        // If no rawHtml or 0 links extracted, fall through and crawl (stored HTML may be incomplete).
        if (hasUsableHtml && addedLinks > 0) continue
      }

      try {
        // Update status before crawling
        if (processed - lastStatusUpdate >= statusUpdateInterval || processed === 0) {
          const statusMessage = getStatusMessage(processed, maxPages, url)
          await withRetry(() =>
            prisma.job.update({
              where: { id: job.id! },
              data: {
                metadata: {
                  statusMessage,
                  currentUrl: url.length > 60 ? url.substring(0, 60) + '...' : url,
                  depth,
                  queueSize: toVisit.length,
                },
              },
            })
          )
          lastStatusUpdate = processed
        }

        const crawled = await crawler.crawlPage(normalizedUrl, config)
        crawled.crawlDepth = depth

        const baseOrigin = (() => {
          try {
            return new URL(config.baseUrl || '').origin
          } catch {
            return ''
          }
        })()

        // Save page to database (with slug for friendly URLs)
        const existingPage = await withRetry(() =>
          prisma.page.findUnique({
            where: {
              projectId_urlHash: { projectId, urlHash: crawled.urlHash },
            },
            select: { id: true, slug: true },
          })
        )
        const baseSlug = pageSlugFromTitleOrUrl(crawled.title, crawled.url)
        const pageSlug = await ensureUniquePageSlug(
          projectId,
          baseSlug,
          existingPage?.id
        )
        const savedPage = await withRetry(() =>
          prisma.page.upsert({
            where: {
              projectId_urlHash: {
                projectId,
                urlHash: crawled.urlHash,
              },
            },
            create: {
              projectId,
              slug: pageSlug,
              url: crawled.url,
              urlHash: crawled.urlHash,
              title: crawled.title,
              metaDescription: crawled.metaDescription,
              rawHtml: crawled.rawHtml,
              extractedContent: crawled.extractedContent,
              structuredContent: crawled.structuredContent,
              wordCount: crawled.wordCount,
              contentType: crawled.contentType,
              crawlDepth: crawled.crawlDepth,
              status: 'crawled',
            },
            update: {
              slug: existingPage?.slug ?? pageSlug,
              title: crawled.title,
              metaDescription: crawled.metaDescription,
              rawHtml: crawled.rawHtml,
              extractedContent: crawled.extractedContent,
              structuredContent: crawled.structuredContent,
              wordCount: crawled.wordCount,
              contentType: crawled.contentType,
              crawlDepth: crawled.crawlDepth,
              status: 'crawled',
              crawledAt: new Date(),
            },
          })
        )

        // Save links to link database
        await withRetry(async () => {
          await prisma.pageLink.deleteMany({
            where: { sourcePageId: savedPage.id },
          })
          if (crawled.links.length > 0) {
            const targetHashes = crawled.links.map((link) =>
              getUrlHash(typeof link === 'string' ? link : link.url)
            )
            const targetPages = await prisma.page.findMany({
              where: { projectId, urlHash: { in: targetHashes } },
              select: { id: true, urlHash: true },
            })
            const targetMap = new Map(targetPages.map((p) => [p.urlHash, p.id]))
            const linkRecords = crawled.links.map((link) => {
              const linkUrl = typeof link === 'string' ? link : link.url
              const anchorText = typeof link === 'string' ? null : (link.anchorText ?? null)
              const targetHash = getUrlHash(linkUrl)
              let isInternal = true
              try {
                isInternal = new URL(linkUrl).origin === baseOrigin
              } catch {
                isInternal = false
              }
              return {
                projectId,
                sourcePageId: savedPage.id,
                targetUrl: linkUrl,
                targetUrlHash: targetHash,
                anchorText,
                isInternal,
                targetPageId: targetMap.get(targetHash) ?? null,
              }
            })
            await prisma.pageLink.createMany({
              data: linkRecords,
              skipDuplicates: true,
            })
          }
        })

        processed++

        // Add new links to visit (links are already normalized by crawler)
        if (depth < maxDepth) {
          for (const link of crawled.links) {
            const normalizedLink = typeof link === 'string' ? normalizeUrl(link) : normalizeUrl(link.url)
            if (!visited.has(normalizedLink)) {
              toVisit.push({ url: normalizedLink, depth: depth + 1 })
            }
          }
        }

        // Append to scan log for live progress UI (keep last 100)
        const currentJob = await withRetry(() =>
          prisma.job.findUnique({
            where: { id: job.id! },
            select: { metadata: true },
          })
        )
        const meta = (currentJob?.metadata as Record<string, unknown>) || {}
        const scannedPages: Array<{ title: string; url: string; wordCount: number; linksCount: number; depth: number }> = Array.isArray(meta.scannedPages) ? meta.scannedPages : []
        scannedPages.unshift({
          title: crawled.title || 'Untitled',
          url: crawled.url.length > 80 ? crawled.url.slice(0, 77) + '...' : crawled.url,
          wordCount: crawled.wordCount ?? 0,
          linksCount: crawled.links.length,
          depth,
        })
        const recentScanned = scannedPages.slice(0, 100)
        const totalLinksDiscovered = (meta.totalLinksDiscovered as number) || 0

        const statusMessage = getStatusMessage(processed, maxPages, url)
        await withRetry(() =>
          prisma.job.update({
            where: { id: job.id! },
            data: {
              processedItems: processed,
              progress: Math.round((processed / maxPages) * 100),
              metadata: {
                ...meta,
                statusMessage,
                currentUrl: url.length > 60 ? url.substring(0, 60) + '...' : url,
                depth,
                queueSize: toVisit.length,
                linksFound: crawled.links.length,
                lastPageTitle: crawled.title || 'Untitled',
                scannedPages: recentScanned,
                totalLinksDiscovered: totalLinksDiscovered + crawled.links.length,
              },
            },
          })
        )

        // Rate limiting
        if (config.rateLimitMs) {
          await new Promise((resolve) => setTimeout(resolve, config.rateLimitMs))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error crawling ${url}:`, errorMessage)
        
        // Log specific error types with helpful messages
        if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
          console.log(`Page timeout: ${url.substring(0, 60)}... - skipping and continuing`)
        } else if (errorMessage.includes('Network error') || errorMessage.includes('net::')) {
          console.log(`Network error: ${url.substring(0, 60)}... - skipping and continuing`)
        } else if (errorMessage.includes('Navigation')) {
          console.log(`Navigation error: ${url.substring(0, 60)}... - skipping and continuing`)
        } else {
          console.log(`Error: ${url.substring(0, 60)}... - ${errorMessage.substring(0, 50)}`)
        }

        // Update job metadata with error info (but don't fail the whole job)
        try {
          const currentJob = await withRetry(() =>
            prisma.job.findUnique({
              where: { id: job.id! },
              select: { metadata: true },
            })
          )
          
          const currentMetadata = (currentJob?.metadata as Record<string, any>) || {}
          const errors = currentMetadata.errors || []
          
          await withRetry(() =>
            prisma.job.update({
              where: { id: job.id! },
              data: {
                metadata: {
                  ...currentMetadata,
                  errors: [
                    ...errors,
                    { 
                      url: url.length > 100 ? url.substring(0, 100) + '...' : url, 
                      error: errorMessage.substring(0, 200), 
                      timestamp: new Date().toISOString() 
                    },
                  ].slice(-20), // Keep last 20 errors
                  failedPages: (currentMetadata.failedPages || 0) + 1,
                },
              },
            })
          )
        } catch (updateError) {
          // Don't fail the whole job if metadata update fails
          console.error('Error updating job metadata:', updateError)
        }

        // Continue with next URL - don't let one bad page stop the crawl
        // This is important: we want to crawl as many pages as possible
      }
    }

    const finalMetadata = (await withRetry(() =>
      prisma.job.findUnique({
        where: { id: job.id! },
        select: { metadata: true },
      })
    ))?.metadata as Record<string, unknown> | undefined
    const errors = Array.isArray(finalMetadata?.errors) ? finalMetadata.errors : []

    if (processed === 0 && errors.length > 0) {
      const firstError = errors[0] as { url?: string; error?: string }
      const errMsg = firstError?.error || 'Unknown error'
      await withRetry(() =>
        prisma.job.update({
          where: { id: job.id! },
          data: {
            status: 'failed',
            errorMessage: `Could not crawl any pages. First error: ${errMsg}. Install the browser with: npm run setup:playwright`,
            completedAt: new Date(),
            metadata: {
              ...finalMetadata,
              statusMessage: `Crawl failed: ${errMsg}`,
              completed: false,
            },
          },
        })
      )
      return { processed: 0, total: 0, failed: true }
    }

    await withRetry(() =>
      prisma.job.update({
        where: { id: job.id! },
        data: {
          status: 'completed',
          completedAt: new Date(),
          progress: processed > 0 ? 100 : 0,
          processedItems: processed,
          totalItems: Math.max(processed, maxPages),
          metadata: {
            ...finalMetadata,
            statusMessage: `Crawl complete: Successfully processed ${processed} pages`,
            completed: true,
          },
        },
      })
    )

    return { processed, total: processed }
  } catch (error) {
    try {
      await withRetry(() =>
        prisma.job.update({
          where: { id: job.id! },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        })
      )
    } catch (updateError) {
      console.error('Failed to update job status on error:', updateError)
    }
    throw error
  } finally {
    try {
      await crawler.close()
    } catch (closeError) {
      console.error('Error closing crawler:', closeError)
    }
  }
})
