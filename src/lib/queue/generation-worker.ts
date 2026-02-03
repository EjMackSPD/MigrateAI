import { Job } from 'bullmq'
import { createWorker } from './index'
import { GenerationService } from '@/lib/services/generator'
import { prisma } from '@/lib/db'

interface GenerationJobData {
  pillarId: string
  config: {
    contentType: string
    titleSuggestion?: string
    additionalGuidance?: string
    sourcePageIds: string[]
  }
}

export const generationWorker = createWorker(
  'generation',
  async (job: Job<GenerationJobData>) => {
    await prisma.$connect()
    const { pillarId, config } = job.data
    const generator = new GenerationService()

    try {
      await prisma.job.update({
        where: { id: job.id! },
        data: { status: 'running', startedAt: new Date() },
      })

      const draft = await generator.generateDraft(pillarId, {
        contentType: config.contentType as any,
        titleSuggestion: config.titleSuggestion,
        additionalGuidance: config.additionalGuidance,
        sourcePageIds: config.sourcePageIds,
      })

      // Create draft record
      const created = await prisma.draft.create({
        data: {
          pillarId,
          title: draft.title,
          slug: draft.slug,
          content: draft.content,
          contentType: config.contentType as any,
          sourcePageIds: config.sourcePageIds,
          schemaRecommendations: draft.schemaRecommendations,
          generationPrompt: `Generated via API`,
          status: 'draft',
        },
      })

      // Create initial version
      await prisma.draftVersion.create({
        data: {
          draftId: created.id,
          content: draft.content,
          versionNumber: 1,
          changeNotes: 'Initial generated version',
        },
      })

      await prisma.job.update({
        where: { id: job.id! },
        data: {
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          processedItems: 1,
          totalItems: 1,
        },
      })

      return { draftId: created.id }
    } catch (error) {
      await prisma.job.update({
        where: { id: job.id! },
        data: {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      })
      throw error
    }
  }
)
