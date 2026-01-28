export interface ExtractedContent {
  title: string | null
  metaDescription: string | null
  content: string
  wordCount: number
  contentType: string | null
}

export class ContentExtractor {
  extract(html: string, url: string): ExtractedContent {
    // Simple extraction - in production, use a proper HTML parser like cheerio
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? this.cleanText(titleMatch[1]) : null

    const metaMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    )
    const metaDescription = metaMatch ? this.cleanText(metaMatch[1]) : null

    // Extract main content - remove scripts, styles, nav, footer, etc.
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')

    // Try to find main content area
    const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const contentMatch =
      mainMatch || articleMatch || content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

    if (contentMatch) {
      content = contentMatch[1]
    }

    // Remove all HTML tags
    content = content.replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    content = this.decodeHtmlEntities(content)
    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim()

    const wordCount = content.split(/\s+/).filter((word) => word.length > 0)
      .length

    const contentType = this.detectContentType(url, content)

    return {
      title,
      metaDescription,
      content,
      wordCount,
      contentType,
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    }

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity
    })
  }

  private detectContentType(url: string, content: string): string {
    const path = new URL(url).pathname.toLowerCase()

    if (path.includes('/blog/') || path.includes('/post/')) return 'blog'
    if (path.includes('/product/') || path.includes('/shop/')) return 'product'
    if (path.includes('/faq') || path.includes('/help')) return 'faq'
    if (path.includes('/about')) return 'about'
    if (path === '/' || path === '') return 'landing'

    // Check content for FAQ indicators
    if (content.match(/\?/g) && content.match(/\?/g)!.length > 3) {
      return 'faq'
    }

    return 'page'
  }
}
