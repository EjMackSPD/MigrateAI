/**
 * Parse raw HTML to extract page structure: semantic regions, headings, meta tags, and counts.
 * Used on the page detail view to show structure, sections, and extracted information.
 */

import * as cheerio from 'cheerio'

export interface HeadingItem {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
}

export interface MetaItem {
  name?: string
  property?: string
  content: string
}

export interface ContentSection {
  heading: HeadingItem
  content: string
  wordCount: number
}

export interface SemanticRegion {
  tag: 'header' | 'nav' | 'main' | 'footer' | 'aside' | 'section' | 'article'
  headings: HeadingItem[]
  contentPreview: string
  wordCount: number
  sections?: ContentSection[]
}

export interface ImageAsset {
  src: string
  alt?: string
}

export interface OutboundLink {
  href: string
  text?: string
}

export interface PageStructure {
  headings: HeadingItem[]
  metaTags: MetaItem[]
  linkCount: number
  imageCount: number
  regions: SemanticRegion[]
  images: ImageAsset[]
  outboundLinks: OutboundLink[]
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Extract headings and content sections from a container (heading + following content until next heading) */
function extractSections($: cheerio.CheerioAPI, $container: cheerio.Cheerio<any>): ContentSection[] {
  const sections: ContentSection[] = []
  const $headings = $container.find('h1, h2, h3, h4, h5, h6')
  $headings.each((i, hEl) => {
    const tag = (hEl as { name: string }).name.toLowerCase()
    const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
    const text = cleanText($(hEl).text())
    if (!text) return
    const heading: HeadingItem = { level, text }
    const $next = $headings.eq(i + 1)
    let content = ''
    if ($next.length) {
      const between = $(hEl).nextUntil($next.get(0))
      content = cleanText(between.text())
    } else {
      content = cleanText($(hEl).nextAll().text())
    }
    sections.push({
      heading,
      content: content.slice(0, 500) + (content.length > 500 ? '…' : ''),
      wordCount: content ? content.split(/\s+/).filter(Boolean).length : 0,
    })
  })
  return sections
}

function resolveUrl(baseUrl: string, href: string): string {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return ''
  try {
    return new URL(href, baseUrl).href
  } catch {
    return href
  }
}

function isOutbound(pageOrigin: string, href: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false
  try {
    const linkOrigin = new URL(href).origin
    return linkOrigin !== pageOrigin
  } catch {
    return false
  }
}

export function parsePageStructure(
  html: string | null | undefined,
  pageUrl?: string
): PageStructure {
  const result: PageStructure = {
    headings: [],
    metaTags: [],
    linkCount: 0,
    imageCount: 0,
    regions: [],
    images: [],
    outboundLinks: [],
  }

  if (!html || typeof html !== 'string') return result

  const $ = cheerio.load(html)
  const baseUrl = pageUrl || 'https://example.com'
  let pageOrigin = 'https://example.com'
  try {
    pageOrigin = new URL(baseUrl).origin
  } catch { /* ignore */ }

  // Headings h1–h6 (order preserved)
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = (el as { name: string }).name.toLowerCase()
    const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
    const text = cleanText($(el).text())
    if (text) result.headings.push({ level, text })
  })

  // Meta tags
  $('meta[name][content], meta[property][content]').each((_, el) => {
    const name = $(el).attr('name')
    const property = $(el).attr('property')
    const content = $(el).attr('content')?.trim() || ''
    if (!content) return
    if (name) result.metaTags.push({ name, content })
    else if (property) result.metaTags.push({ property, content })
  })

  // Link and image counts
  result.linkCount = $('a[href]').length
  result.imageCount = $('img').length

  // Images (assets) with absolute URLs
  const seenImgSrc = new Set<string>()
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src')?.trim()
    if (!src) return
    const absSrc = resolveUrl(baseUrl, src)
    if (!absSrc || seenImgSrc.has(absSrc)) return
    seenImgSrc.add(absSrc)
    result.images.push({
      src: absSrc,
      alt: $(el).attr('alt')?.trim() || undefined,
    })
  })

  // Outbound links (different origin)
  const seenLinks = new Set<string>()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim()
    if (!href) return
    const absHref = resolveUrl(baseUrl, href)
    if (!absHref || !isOutbound(pageOrigin, absHref) || seenLinks.has(absHref)) return
    seenLinks.add(absHref)
    result.outboundLinks.push({
      href: absHref,
      text: cleanText($(el).text()) || undefined,
    })
  })

  // Semantic regions
  const regionTags = ['header', 'nav', 'main', 'footer', 'aside'] as const
  for (const tag of regionTags) {
    $(tag).each((_: number, el: any) => {
      const $region = $(el)
      const headings: HeadingItem[] = []
      $region.find('h1, h2, h3, h4, h5, h6').each((_, h) => {
        const ht = (h as { name: string }).name.toLowerCase()
        const level = parseInt(ht[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
        const text = cleanText($(h).text())
        if (text) headings.push({ level, text })
      })
      const text = cleanText($region.text())
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0
      const contentPreview = text.length > 200 ? text.slice(0, 200) + '…' : text
      const sections = tag === 'main' ? extractSections($, $region) : undefined
      result.regions.push({
        tag,
        headings,
        contentPreview,
        wordCount,
        sections: sections && sections.length > 0 ? sections : undefined,
      })
    })
  }

  // Standalone sections/articles if no main
  if (result.regions.length === 0) {
    $('section, article').each((_: number, el: any) => {
      const tagName = (el as { name: string }).name.toLowerCase() as 'section' | 'article'
      const $region = $(el)
      const headings: HeadingItem[] = []
      $region.find('h1, h2, h3, h4, h5, h6').each((_, h) => {
        const ht = (h as { name: string }).name.toLowerCase()
        const level = parseInt(ht[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
        const text = cleanText($(h).text())
        if (text) headings.push({ level, text })
      })
      const text = cleanText($region.text())
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0
      const contentPreview = text.length > 200 ? text.slice(0, 200) + '…' : text
      const sections = extractSections($, $region)
      result.regions.push({
        tag: tagName,
        headings,
        contentPreview,
        wordCount,
        sections: sections.length > 0 ? sections : undefined,
      })
    })
  }

  return result
}

/** Meta keys we care to show (OG, Twitter, etc.) */
export const DISPLAY_META_KEYS = new Set([
  'description',
  'keywords',
  'og:title',
  'og:description',
  'og:image',
  'og:type',
  'og:url',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:card',
])

export function getDisplayMeta(metaTags: MetaItem[]): MetaItem[] {
  return metaTags.filter((m) => {
    const key = (m.property || m.name || '').toLowerCase()
    return key && DISPLAY_META_KEYS.has(key)
  })
}

/** Recommended meta tags with best-practice guidance */
export const META_BEST_PRACTICES: Array<{
  key: string
  category: 'SEO' | 'Open Graph' | 'Twitter'
  required: boolean
  guidance: string
}> = [
  { key: 'description', category: 'SEO', required: true, guidance: 'Primary meta description for search results (150-160 chars)' },
  { key: 'keywords', category: 'SEO', required: false, guidance: 'Keywords (less important for modern SEO)' },
  { key: 'og:title', category: 'Open Graph', required: true, guidance: 'Title when shared on social (Facebook, LinkedIn)' },
  { key: 'og:description', category: 'Open Graph', required: true, guidance: 'Description for social shares' },
  { key: 'og:image', category: 'Open Graph', required: true, guidance: 'Image URL for social previews (1200×630px recommended)' },
  { key: 'og:type', category: 'Open Graph', required: false, guidance: 'Content type (website, article, etc.)' },
  { key: 'og:url', category: 'Open Graph', required: false, guidance: 'Canonical URL of the page' },
  { key: 'twitter:title', category: 'Twitter', required: false, guidance: 'Title for Twitter (falls back to og:title)' },
  { key: 'twitter:description', category: 'Twitter', required: false, guidance: 'Description for Twitter' },
  { key: 'twitter:image', category: 'Twitter', required: false, guidance: 'Image for Twitter card' },
  { key: 'twitter:card', category: 'Twitter', required: false, guidance: 'Card type (summary, summary_large_image)' },
]

export interface MetaGap {
  key: string
  category: string
  required: boolean
  guidance: string
  status: 'present' | 'missing'
  value?: string
}

export function getMetaGaps(metaTags: MetaItem[]): MetaGap[] {
  const presentKeys = new Set(
    metaTags.map((m) => (m.property || m.name || '').toLowerCase()).filter(Boolean)
  )
  return META_BEST_PRACTICES.map((rec) => {
    const found = metaTags.find(
      (m) => (m.property || m.name || '').toLowerCase() === rec.key
    )
    return {
      key: rec.key,
      category: rec.category,
      required: rec.required,
      guidance: rec.guidance,
      status: found ? 'present' : 'missing',
      value: found?.content,
    }
  })
}
