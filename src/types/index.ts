// Common types used throughout the application

export interface User {
  id: string
  email: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  clientName: string
  baseUrl: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'archived'
  settings: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Page {
  id: string
  projectId: string
  url: string
  urlHash: string
  title: string | null
  metaDescription: string | null
  rawHtml: string | null
  extractedContent: string | null
  wordCount: number | null
  contentType: string | null
  detectedTopics: string[]
  qualityScore: number | null
  embedding: number[] | null
  crawlDepth: number | null
  status: 'crawled' | 'analyzed' | 'matched' | 'used'
  crawledAt: Date
  analyzedAt: Date | null
}

export interface Pillar {
  id: string
  projectId: string
  name: string
  slug: string
  description: string
  targetAudience: string | null
  keyThemes: string[]
  toneNotes: string | null
  primaryKeywords: string[]
  priority: number
  status: 'active' | 'paused' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface Match {
  id: string
  pageId: string
  pillarId: string
  relevanceScore: number | null
  isSelected: boolean
  isExcluded: boolean
  matchedAt: Date
  selectedAt: Date | null
}

export interface Draft {
  id: string
  pillarId: string
  title: string
  slug: string
  content: string
  contentType: 'pillar_page' | 'supporting_article' | 'faq_page' | 'glossary' | 'comparison'
  sourcePageIds: string[]
  schemaRecommendations: Record<string, any> | null
  generationPrompt: string | null
  status: 'draft' | 'in_review' | 'approved' | 'exported'
  createdAt: Date
  updatedAt: Date
  approvedAt: Date | null
  approvedBy: string | null
  exportedAt: Date | null
}

export interface Job {
  id: string
  projectId: string | null
  jobType: 'crawl' | 'analyze' | 'match' | 'generate'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  totalItems: number | null
  processedItems: number
  errorMessage: string | null
  metadata: Record<string, any>
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}
