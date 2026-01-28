import { prisma } from '@/lib/db'
import { AnalysisService } from './analyzer'

export interface MatchConfig {
  minRelevance?: number
  maxResults?: number
  includePreviouslyMatched?: boolean
}

export class MatchingService {
  private analyzer: AnalysisService

  constructor() {
    this.analyzer = new AnalysisService()
  }

  async findMatches(
    pillarId: string,
    config: MatchConfig = {}
  ): Promise<Array<{
    pageId: string
    relevanceScore: number
  }>> {
    const pillar = await prisma.pillar.findUnique({
      where: { id: pillarId },
    })

    if (!pillar) {
      throw new Error('Pillar not found')
    }

    // Generate embedding for pillar description + themes
    const pillarText = [
      pillar.description,
      pillar.targetAudience || '',
      ...pillar.keyThemes,
      ...pillar.primaryKeywords,
    ]
      .filter(Boolean)
      .join(' ')

    const pillarEmbedding = await this.analyzer.generateEmbedding(pillarText)

    // Find matching pages using vector similarity
    // Note: This uses raw SQL because Prisma doesn't support pgvector operations directly
    const minRelevance = config.minRelevance || 0.7
    const maxResults = config.maxResults || 100

    const matches = await prisma.$queryRaw<Array<{
      id: string
      relevance_score: number
    }>>`
      SELECT 
        p.id,
        1 - (p.embedding <=> ${JSON.stringify(pillarEmbedding)}::vector) as relevance_score
      FROM pages p
      WHERE 
        p.project_id = ${pillar.projectId}
        AND p.embedding IS NOT NULL
        AND p.status = 'analyzed'
        AND (1 - (p.embedding <=> ${JSON.stringify(pillarEmbedding)}::vector)) >= ${minRelevance}
      ORDER BY p.embedding <=> ${JSON.stringify(pillarEmbedding)}::vector
      LIMIT ${maxResults}
    `

    // Create or update match records
    for (const match of matches) {
      await prisma.match.upsert({
        where: {
          pageId_pillarId: {
            pageId: match.id,
            pillarId: pillarId,
          },
        },
        create: {
          pageId: match.id,
          pillarId: pillarId,
          relevanceScore: match.relevance_score,
        },
        update: {
          relevanceScore: match.relevance_score,
          matchedAt: new Date(),
        },
      })
    }

    return matches.map((m) => ({
      pageId: m.id,
      relevanceScore: Number(m.relevance_score),
    }))
  }

  async calculateRelevance(
    pillarId: string,
    pageId: string
  ): Promise<number> {
    const pillar = await prisma.pillar.findUnique({
      where: { id: pillarId },
    })
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    })

    if (!pillar || !page) {
      return 0
    }

    // Check if page has embedding using raw query
    const embeddingCheck = await prisma.$queryRaw<Array<{ has_embedding: boolean }>>`
      SELECT embedding IS NOT NULL as has_embedding
      FROM pages
      WHERE id = ${pageId}
    `

    if (!embeddingCheck[0]?.has_embedding) {
      return 0
    }

    const pillarText = [
      pillar.description,
      pillar.targetAudience || '',
      ...pillar.keyThemes,
      ...pillar.primaryKeywords,
    ]
      .filter(Boolean)
      .join(' ')

    const pillarEmbedding = await this.analyzer.generateEmbedding(pillarText)

    // Calculate cosine similarity
    const result = await prisma.$queryRaw<Array<{
      similarity: number
    }>>`
      SELECT 
        1 - (embedding <=> ${JSON.stringify(pillarEmbedding)}::vector) as similarity
      FROM pages
      WHERE id = ${pageId}
    `

    return result[0]?.similarity ? Number(result[0].similarity) : 0
  }
}
