import { Job } from 'bullmq'
import { createWorker } from './index'
import { MatchingService } from '@/lib/services/matcher'
import { prisma } from '@/lib/db'

interface MatchJobData {
  pillarId: string
  config: {
    minRelevance?: number
    maxResults?: number
  }
}

export const matchWorker = createWorker('match', async (job: Job<MatchJobData>) => {
  const { pillarId, config } = job.data
  const matcher = new MatchingService()

  try {
    await prisma.job.update({
      where: { id: job.id! },
      data: { status: 'running', startedAt: new Date() },
    })

    const matches = await matcher.findMatches(pillarId, config)

    await prisma.job.update({
      where: { id: job.id! },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        processedItems: matches.length,
        totalItems: matches.length,
      },
    })

    return { matches: matches.length }
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
