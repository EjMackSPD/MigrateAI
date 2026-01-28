import { Job } from 'bullmq'
import { createWorker } from './index'
import { CrawlerService, CrawlConfig } from '@/lib/services/crawler'
import { prisma } from '@/lib/db'

interface CrawlJobData {
  projectId: string
  config: CrawlConfig
}

export const crawlWorker = createWorker('crawl', async (job: Job<CrawlJobData>) => {
  const { projectId, config } = job.data
  const crawler = new CrawlerService()

  try {
    await crawler.initialize()

    // Update job status
    await prisma.job.update({
      where: { id: job.id! },
      data: { status: 'running', startedAt: new Date() },
    })

    const visited = new Set<string>()
    const toVisit: Array<{ url: string; depth: number }> = [
      { url: config.baseUrl || '', depth: 0 },
    ]

    let processed = 0
    const maxPages = config.maxPages || 100
    const maxDepth = config.maxDepth || 5

    while (toVisit.length > 0 && processed < maxPages) {
      const { url, depth } = toVisit.shift()!

      if (visited.has(url) || depth > maxDepth) continue
      visited.add(url)

      try {
        const crawled = await crawler.crawlPage(url, config)
        crawled.crawlDepth = depth

        // Save page to database
        await prisma.page.upsert({
          where: {
            projectId_urlHash: {
              projectId,
              urlHash: crawled.urlHash,
            },
          },
          create: {
            projectId,
            url: crawled.url,
            urlHash: crawled.urlHash,
            title: crawled.title,
            metaDescription: crawled.metaDescription,
            rawHtml: crawled.rawHtml,
            extractedContent: crawled.extractedContent,
            wordCount: crawled.wordCount,
            contentType: crawled.contentType,
            crawlDepth: crawled.crawlDepth,
            status: 'crawled',
          },
          update: {
            title: crawled.title,
            metaDescription: crawled.metaDescription,
            rawHtml: crawled.rawHtml,
            extractedContent: crawled.extractedContent,
            wordCount: crawled.wordCount,
            contentType: crawled.contentType,
            crawlDepth: crawled.crawlDepth,
            status: 'crawled',
            crawledAt: new Date(),
          },
        })

        processed++

        // Add new links to visit
        if (depth < maxDepth) {
          for (const link of crawled.links) {
            if (!visited.has(link)) {
              toVisit.push({ url: link, depth: depth + 1 })
            }
          }
        }

        // Update progress
        await prisma.job.update({
          where: { id: job.id! },
          data: {
            processedItems: processed,
            progress: Math.round((processed / maxPages) * 100),
          },
        })

        // Rate limiting
        if (config.rateLimitMs) {
          await new Promise((resolve) => setTimeout(resolve, config.rateLimitMs))
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error)
        // Continue with next URL
      }
    }

    await prisma.job.update({
      where: { id: job.id! },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        processedItems: processed,
        totalItems: processed,
      },
    })

    return { processed, total: processed }
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id! },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    })
    throw error
  } finally {
    await crawler.close()
  }
})
