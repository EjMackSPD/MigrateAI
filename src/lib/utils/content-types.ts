/**
 * Content type utilities and labels
 * Used throughout the application for consistent display
 */

export type ContentType =
  | 'pillar_page'
  | 'supporting_article'
  | 'faq_page'
  | 'glossary'
  | 'comparison'

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  pillar_page: 'Pillar Page',
  supporting_article: 'Supporting Article',
  faq_page: 'FAQ Page',
  glossary: 'Glossary',
  comparison: 'Comparison',
}

export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  pillar_page: 'Comprehensive hub content covering all major aspects of a topic',
  supporting_article: 'Focused article on a specific subtopic',
  faq_page: 'Consolidated Q&A with concise answers',
  glossary: 'Definition-focused reference with key terms and definitions',
  comparison: 'Side-by-side evaluation of options or approaches',
}

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  pillar_page: '📄',
  supporting_article: '📄',
  faq_page: '❓',
  glossary: '📖',
  comparison: '⚖️',
}

/**
 * Format content type for display
 */
export function formatContentType(contentType: ContentType | string): string {
  return CONTENT_TYPE_LABELS[contentType as ContentType] || contentType
}

/**
 * Get content type description
 */
export function getContentTypeDescription(
  contentType: ContentType | string
): string {
  return (
    CONTENT_TYPE_DESCRIPTIONS[contentType as ContentType] ||
    'Content piece'
  )
}

/**
 * Get content type icon
 */
export function getContentTypeIcon(contentType: ContentType | string): string {
  return CONTENT_TYPE_ICONS[contentType as ContentType] || '📄'
}

/**
 * Check if content type is valid
 */
export function isValidContentType(
  value: string
): value is ContentType {
  return value in CONTENT_TYPE_LABELS
}
