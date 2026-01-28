import { Anthropic } from '@anthropic-ai/sdk'
import { GEO_SYSTEM_PROMPT } from '@/lib/prompts/system'
import { buildUserPrompt } from '@/lib/prompts/content-types'
import { prisma } from '@/lib/db'

export interface GenerationConfig {
  contentType: 'pillar_page' | 'supporting_article' | 'faq_page' | 'glossary' | 'comparison'
  titleSuggestion?: string
  additionalGuidance?: string
  sourcePageIds: string[]
}

export class GenerationService {
  private claude: Anthropic

  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }

  async generateDraft(
    pillarId: string,
    config: GenerationConfig
  ): Promise<{
    title: string
    slug: string
    content: string
    schemaRecommendations: Record<string, any>
  }> {
    const pillar = await prisma.pillar.findUnique({
      where: { id: pillarId },
    })

    if (!pillar) {
      throw new Error('Pillar not found')
    }

    // Get source pages
    const sourcePages = await prisma.page.findMany({
      where: {
        id: { in: config.sourcePageIds },
      },
      select: {
        id: true,
        url: true,
        title: true,
        extractedContent: true,
      },
    })

    if (sourcePages.length === 0) {
      throw new Error('No source pages found')
    }

    // Build prompt
    const userPrompt = buildUserPrompt(
      pillar,
      sourcePages,
      config.contentType,
      config.additionalGuidance
    )

    // Generate content
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: GEO_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const generatedText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract title and content
    const titleMatch = generatedText.match(/^#\s+(.+)$/m)
    const title = config.titleSuggestion || titleMatch?.[1] || pillar.name

    // Remove title from content if present
    let content = generatedText
    if (titleMatch) {
      content = generatedText.replace(/^#\s+.+$/m, '').trim()
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Extract schema recommendations from HTML comments
    const schemaMatch = content.match(/<!--\s*Schema Recommendations:?\s*([\s\S]*?)-->/i)
    let schemaRecommendations: Record<string, any> = {}
    if (schemaMatch) {
      try {
        schemaRecommendations = JSON.parse(schemaMatch[1])
      } catch {
        // If parsing fails, generate basic schema
        schemaRecommendations = this.generateBasicSchema(config.contentType, title)
      }
    } else {
      schemaRecommendations = this.generateBasicSchema(config.contentType, title)
    }

    return {
      title,
      slug,
      content,
      schemaRecommendations,
    }
  }

  private generateBasicSchema(
    contentType: string,
    title: string
  ): Record<string, any> {
    const base = {
      '@context': 'https://schema.org',
    }

    switch (contentType) {
      case 'pillar_page':
      case 'supporting_article':
        return {
          ...base,
          '@type': 'Article',
          headline: title,
          author: { '@type': 'Person', name: '[PLACEHOLDER]' },
          datePublished: '[PLACEHOLDER]',
        }
      case 'faq_page':
        return {
          ...base,
          '@type': 'FAQPage',
          mainEntity: [],
        }
      default:
        return base
    }
  }
}
