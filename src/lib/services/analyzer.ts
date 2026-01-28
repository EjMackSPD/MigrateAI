import { Anthropic } from '@anthropic-ai/sdk'
import { getEmbeddingService } from './embeddings'

export class AnalysisService {
  private claude: Anthropic
  private embeddingService: ReturnType<typeof getEmbeddingService>

  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
    this.embeddingService = getEmbeddingService()
  }

  async analyzePage(pageId: string, content: string): Promise<{
    embedding: number[]
    topics: string[]
    qualityScore: number
  }> {
    // Generate embedding
    const embedding = await this.embeddingService.embedText(content)

    // Extract topics using Claude
    const topics = await this.extractTopics(content)

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(content)

    return {
      embedding,
      topics,
      qualityScore,
    }
  }

  private async extractTopics(content: string): Promise<string[]> {
    try {
      const prompt = `Analyze the following web page content and extract 3-7 main topics or themes.
Return only the topics as a JSON array of strings.
Focus on substantive topics, not generic terms.

Content:
${content.substring(0, 8000)}

Topics (JSON array):`

      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const topics = JSON.parse(text.trim())
      return Array.isArray(topics) ? topics : []
    } catch (error) {
      console.error('Error extracting topics:', error)
      return []
    }
  }

  private calculateQualityScore(content: string): number {
    let score = 0
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length

    // Word count score (0-0.3)
    if (wordCount >= 1000) score += 0.3
    else if (wordCount >= 500) score += 0.2
    else if (wordCount >= 200) score += 0.1

    // Structure score (0-0.3)
    const hasHeadings = /#{1,6}\s/.test(content) || /<h[1-6]>/i.test(content)
    const hasLists = /[-*]\s/.test(content) || /<[uo]l>/i.test(content)
    if (hasHeadings && hasLists) score += 0.3
    else if (hasHeadings || hasLists) score += 0.15

    // Readability score (0-0.2)
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const avgWordsPerSentence = wordCount / sentences.length
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) score += 0.2
    else if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 25) score += 0.1

    // Content density (0-0.2)
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size
    const diversity = uniqueWords / wordCount
    if (diversity > 0.5) score += 0.2
    else if (diversity > 0.3) score += 0.1

    return Math.min(1.0, Math.max(0.0, score))
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingService.embedText(text)
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    return this.embeddingService.embedBatch(texts)
  }
}
