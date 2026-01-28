import { Job } from 'bullmq'
import { createWorker } from './index'
import { AnalysisService } from '@/lib/services/analyzer'
import { prisma } from '@/lib/db'

interface AnalysisJobData {
  projectId: string
  pageIds?: string[]
}

export const analysisWorker = createWorker('analysis', async (job: Job<AnalysisJobData>) => {
  const { projectId, pageIds } = job.data
  const analyzer = new AnalysisService()

  try {
    await prisma.job.update({
      where: { id: job.id! },
      data: { status: 'running', startedAt: new Date() },
    })

    // Get pages to analyze
    const pages = await prisma.page.findMany({
      where: {
        projectId,
        id: pageIds ? { in: pageIds } : undefined,
        status: 'crawled',
        extractedContent: { not: null },
      },
    })

    let processed = 0
    const total = pages.length

    await prisma.job.update({
      where: { id: job.id! },
      data: { totalItems: total },
    })

    for (const page of pages) {
      if (!page.extractedContent) continue

      try {
        const analysis = await analyzer.analyzePage(
          page.id,
          page.extractedContent
        )

        // Update page with analysis results
        // Note: For pgvector, we'll need to use raw SQL to insert the embedding
        await prisma.$executeRaw`
          UPDATE pages
          SET 
            embedding = ${JSON.stringify(analysis.embedding)}::vector,
            detected_topics = ${analysis.topics},
            quality_score = ${analysis.qualityScore},
            status = 'analyzed',
            analyzed_at = NOW()
          WHERE id = ${page.id}
        `

        processed++

        await prisma.job.update({
          where: { id: job.id! },
          data: {
            processedItems: processed,
            progress: Math.round((processed / total) * 100),
          },
        })
      } catch (error) {
        console.error(`Error analyzing page ${page.id}:`, error)
        // Continue with next page
      }
    }

    await prisma.job.update({
      where: { id: job.id! },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        processedItems: processed,
      },
    })

    return { processed, total }
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
  }
})
