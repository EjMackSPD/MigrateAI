import type { MetaGap } from './parse-page-structure'
import type { ImageAsset } from './parse-page-structure'

export type RecommendationSeverity = 'high' | 'medium' | 'low'

export interface ContentRecommendation {
  id: string
  severity: RecommendationSeverity
  title: string
  description: string
  action?: string
}

const WORD_COUNT_BY_TYPE: Record<string, number> = {
  pillar_page: 1500,
  supporting_article: 800,
  faq_page: 500,
  glossary: 300,
  comparison: 1000,
}

export function getContentRecommendations(options: {
  h1Count: number
  h1UniqueCount: number
  wordCount: number | null
  contentType: string | null
  qualityScore: number | null
  metaGaps: MetaGap[]
  images: ImageAsset[]
  hasStructuredContent: boolean
}): ContentRecommendation[] {
  const {
    h1Count,
    h1UniqueCount,
    wordCount,
    contentType,
    qualityScore,
    metaGaps,
    images,
    hasStructuredContent,
  } = options

  const recs: ContentRecommendation[] = []

  if (h1Count === 0) {
    recs.push({
      id: 'h1-missing',
      severity: 'high',
      title: 'Add an H1 heading',
      description: 'Pages should have exactly one H1 that clearly states the main topic.',
      action: 'Edit the content and add a single, descriptive H1 at the top.',
    })
  } else if (h1Count > 1 || (h1UniqueCount > 1 && h1Count > 1)) {
    recs.push({
      id: 'h1-multiple',
      severity: 'high',
      title: 'Use a single H1',
      description: `This page has ${h1Count} H1 heading(s). SEO best practice is one H1 per page.`,
      action: 'Consolidate to one main H1 and use H2/H3 for subheadings.',
    })
  }

  const targetWords = contentType ? WORD_COUNT_BY_TYPE[contentType] : 800
  const wc = wordCount ?? 0
  if (targetWords && wc < targetWords) {
    recs.push({
      id: 'word-count',
      severity: wc < targetWords * 0.5 ? 'high' : 'medium',
      title: 'Increase word count',
      description: `${wc} words. Target for ${contentType || 'general'} content: ~${targetWords}+ words.`,
      action: 'Add more depth, examples, or supporting sections.',
    })
  }

  const missingRequired = metaGaps.filter((g) => g.status === 'missing' && g.required)
  if (missingRequired.length > 0) {
    recs.push({
      id: 'meta-gaps',
      severity: 'high',
      title: 'Add missing meta tags',
      description: `Missing required meta: ${missingRequired.map((g) => g.key).join(', ')}.`,
      action: 'Add meta description, Open Graph, and other SEO tags in the page head.',
    })
  }

  const imagesWithoutAlt = images.filter((img) => !img.alt || img.alt.trim() === '')
  if (imagesWithoutAlt.length > 0) {
    recs.push({
      id: 'images-alt',
      severity: 'medium',
      title: 'Add alt text to images',
      description: `${imagesWithoutAlt.length} image(s) missing alt text.`,
      action: 'Add descriptive alt attributes for accessibility and SEO.',
    })
  }

  const q = qualityScore !== null ? Number(qualityScore) : null
  if (q !== null && q < 0.6) {
    recs.push({
      id: 'quality',
      severity: 'medium',
      title: 'Improve content quality',
      description: `Quality score: ${(q * 100).toFixed(0)}%. Content may need more structure or depth.`,
      action: 'Add clear headings, direct answers, and structured sections.',
    })
  }

  if (!hasStructuredContent) {
    recs.push({
      id: 'structure',
      severity: 'low',
      title: 'Improve content structure',
      description: 'Content could benefit from clearer headings and sections.',
      action: 'Use H2/H3 to break up content and add key takeaways.',
    })
  }

  const severityOrder: RecommendationSeverity[] = ['high', 'medium', 'low']
  recs.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))
  return recs
}
