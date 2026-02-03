import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'

export interface ExtractedContent {
  title: string | null
  metaDescription: string | null
  content: string
  structuredContent: string
  wordCount: number
  contentType: string | null
}

export class ContentExtractor {
  extract(html: string, url: string): ExtractedContent {
    const $ = cheerio.load(html)

    // Extract title
    const titleEl = $('title').first()
    const title = titleEl.length ? this.cleanText(titleEl.text()) : null

    // Extract meta description (support both name and property)
    let metaDescription: string | null = null
    const metaDesc = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content')
    if (metaDesc) metaDescription = this.cleanText(metaDesc)

    // Remove boilerplate before finding main content
    $('script, style, noscript, iframe').remove()

    // Find main content area: main > article > [role="main"] > largest text block
    let $content = $('main').first()
    if ($content.length === 0) $content = $('article').first()
    if ($content.length === 0) $content = $('[role="main"]').first()
    if ($content.length === 0) {
      // Fall back to body, excluding nav, footer, header, aside
      $('nav, footer, header, aside').remove()
      $content = $('body')
    }

    // Build structured Markdown and flat text by walking main content
    const structuredParts: string[] = []
    const flatParts: string[] = []

    this.walkContent($, $content.first(), structuredParts, flatParts, url)

    const structuredContent = structuredParts.join('\n\n').trim()
    const content = flatParts.join(' ').replace(/\s+/g, ' ').trim()

    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length
    const contentType = this.detectContentType(url, content)

    return {
      title,
      metaDescription,
      content,
      structuredContent: structuredContent || content,
      wordCount,
      contentType,
    }
  }

  private resolveUrl(base: string, href: string): string {
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return ''
    try {
      return new URL(href, base).href
    } catch {
      return href
    }
  }

  private walkContent(
    $: cheerio.CheerioAPI,
    $node: cheerio.Cheerio<AnyNode>,
    structured: string[],
    flat: string[],
    baseUrl: string = 'https://example.com'
  ): void {
    $node.children().each((_, el) => {
      const node = el as { type?: string; tagName?: string }
      const tagName = (node.type === 'tag' && node.tagName) ? node.tagName.toLowerCase() : ''
      if (!tagName) return
      const $el = $(el)

      if (tagName.match(/^h[1-6]$/)) {
        const level = parseInt(tagName[1], 10)
        const text = this.cleanText($el.text())
        if (text) {
          structured.push('#'.repeat(level) + ' ' + text)
          flat.push(text)
        }
        return
      }

      if (tagName === 'p') {
        const text = this.cleanText($el.text())
        if (text) {
          structured.push(text)
          flat.push(text)
        }
        return
      }

      if (tagName === 'ul' || tagName === 'ol') {
        const items: string[] = []
        $el.find('> li').each((_, li) => {
          const text = this.cleanText($(li).text())
          if (text) items.push(text)
        })
        if (items.length > 0) {
          const isOrdered = tagName === 'ol'
          const markdown = items
            .map((item, i) => (isOrdered ? `${i + 1}. ${item}` : `- ${item}`))
            .join('\n')
          structured.push(markdown)
          flat.push(items.join(' '))
        }
        return
      }

      if (tagName === 'dl') {
        const pairs: string[] = []
        let currentDt = ''
        $el.children().each((_, child) => {
          const childNode = child as { type?: string; tagName?: string }
          const childTag = (childNode.type === 'tag' && childNode.tagName) ? childNode.tagName.toLowerCase() : ''
          if (!childTag) return
          const $child = $(child)
          if (childTag === 'dt') {
            currentDt = this.cleanText($child.text())
          } else if (childTag === 'dd' && currentDt) {
            const dd = this.cleanText($child.text())
            if (dd) {
              pairs.push(`### ${currentDt}\n${dd}`)
              flat.push(currentDt, dd)
            }
            currentDt = ''
          }
        })
        if (pairs.length > 0) {
          structured.push(pairs.join('\n\n'))
        }
        return
      }

      if (tagName === 'blockquote') {
        const text = this.cleanText($el.text())
        if (text) {
          const lines = text.split('\n').map((l) => '> ' + l)
          structured.push(lines.join('\n'))
          flat.push(text)
        }
        return
      }

      if (tagName === 'img') {
        const src = $el.attr('src')?.trim()
        if (!src) return
        const absSrc = this.resolveUrl(baseUrl, src)
        if (!absSrc) return
        const alt = $el.attr('alt')?.trim() || ''
        structured.push(`![${alt}](${absSrc})`)
        return
      }

      if (tagName === 'table') {
        const rows: string[][] = []
        $el.find('tr').each((_, tr) => {
          const row: string[] = []
          $(tr)
            .find('th, td')
            .each((_, cell) => {
              row.push(this.cleanText($(cell).text()))
            })
          if (row.length > 0) rows.push(row)
        })
        if (rows.length > 0) {
          const header = rows[0]
          const sep = header.map(() => '---').join(' | ')
          const markdown =
            '| ' + header.join(' | ') + ' |\n| ' + sep + ' |\n' +
            rows
              .slice(1)
              .map((r) => '| ' + r.join(' | ') + ' |')
              .join('\n')
          structured.push(markdown)
          flat.push(rows.flat().join(' '))
        }
        return
      }

      // Recurse into div, section, span, etc.
      if (['div', 'section', 'span', 'figure', 'figcaption'].includes(tagName)) {
        this.walkContent($, $el, structured, flat, baseUrl)
        return
      }

      // Default: collect text for flat, recurse for structure
      const directText = this.cleanText($el.clone().children().remove().end().text())
      if (directText) {
        flat.push(directText)
      }
      this.walkContent($, $el, structured, flat, baseUrl)
    })
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\u00A0/g, ' ')
      .trim()
  }

  private detectContentType(url: string, content: string): string {
    try {
      const path = new URL(url).pathname.toLowerCase()
      if (path.includes('/blog/') || path.includes('/post/')) return 'blog'
      if (path.includes('/product/') || path.includes('/shop/')) return 'product'
      if (path.includes('/faq') || path.includes('/help')) return 'faq'
      if (path.includes('/about')) return 'about'
      if (path === '/' || path === '') return 'landing'
    } catch {
      // Invalid URL, continue with content heuristics
    }

    if (content.match(/\?/g) && content.match(/\?/g)!.length > 3) return 'faq'

    return 'page'
  }
}
