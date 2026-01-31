/**
 * Parse raw HTML to extract page structure: headings, meta tags, and counts.
 * Used on the page detail view to show "sections found" and extracted information.
 */

export interface HeadingItem {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
}

export interface MetaItem {
  name?: string
  property?: string
  content: string
}

export interface PageStructure {
  headings: HeadingItem[]
  metaTags: MetaItem[]
  linkCount: number
  imageCount: number
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

export function parsePageStructure(html: string | null | undefined): PageStructure {
  const result: PageStructure = {
    headings: [],
    metaTags: [],
    linkCount: 0,
    imageCount: 0,
  }

  if (!html || typeof html !== 'string') return result

  // Headings h1–h6 (order preserved)
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
    const text = cleanText(match[2])
    if (text) result.headings.push({ level, text })
  }

  // Meta tags: name="..." content="..." or property="..." content="..."
  const metaRegex = /<meta[^>]+>/gi
  while ((match = metaRegex.exec(html)) !== null) {
    const tag = match[0]
    const nameMatch = tag.match(/name=["']([^"']+)["']/i)
    const propertyMatch = tag.match(/property=["']([^"']+)["']/i)
    const contentMatch = tag.match(/content=["']([^"']*)["']/i)
    const content = contentMatch ? contentMatch[1].trim() : ''
    if (!content) continue
    if (nameMatch) result.metaTags.push({ name: nameMatch[1], content })
    else if (propertyMatch) result.metaTags.push({ property: propertyMatch[1], content })
  }

  // Link count (anchors with href)
  const linkMatches = html.match(/<a[^>]+href\s*=\s*["'][^"']*["']/gi)
  result.linkCount = linkMatches ? linkMatches.length : 0

  // Image count
  const imgMatches = html.match(/<img[^>]*>/gi)
  result.imageCount = imgMatches ? imgMatches.length : 0

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
