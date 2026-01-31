/**
 * Workflow stage definitions and utilities
 * Based on the core workflow from the specification:
 * INGEST -> ANALYZE -> CONFIGURE -> MATCH -> GENERATE -> REVIEW -> EXPORT
 */

export type WorkflowStage =
  | 'not_started'
  | 'ingest'
  | 'analyze'
  | 'configure'
  | 'match'
  | 'generate'
  | 'review'
  | 'export'

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'not_started',
  'ingest',
  'analyze',
  'configure',
  'match',
  'generate',
  'review',
  'export',
]

export const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  not_started: 'Not Started',
  ingest: 'Ingestion',
  analyze: 'Analysis',
  configure: 'Config',
  match: 'Matching',
  generate: 'Generation',
  review: 'Review',
  export: 'Export',
}

export const WORKFLOW_STAGE_DESCRIPTIONS: Record<WorkflowStage, string> = {
  not_started: 'Project created, ready to begin',
  ingest: 'Crawling legacy site content',
  analyze: 'Extracting topics and generating embeddings',
  configure: 'Defining content pillars and strategy',
  match: 'Finding relevant legacy content per pillar',
  generate: 'Creating GEO-optimized drafts',
  review: 'Human editor refines and approves',
  export: 'Exporting to Markdown files with metadata',
}

export const WORKFLOW_STAGE_ICONS: Record<WorkflowStage, string> = {
  not_started: '📄',
  ingest: '🔗',
  analyze: '🔎',
  configure: '⚙️',
  match: '🔗',
  generate: '📝',
  review: '✓',
  export: '📤',
}

/**
 * Get the next workflow stage
 */
export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage)
  if (currentIndex === -1 || currentIndex === WORKFLOW_STAGES.length - 1) {
    return null
  }
  return WORKFLOW_STAGES[currentIndex + 1]
}

/**
 * Get the previous workflow stage
 */
export function getPreviousStage(
  currentStage: WorkflowStage
): WorkflowStage | null {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage)
  if (currentIndex <= 0) {
    return null
  }
  return WORKFLOW_STAGES[currentIndex - 1]
}

/**
 * Check if a stage transition is valid
 */
export function canTransitionTo(
  currentStage: WorkflowStage,
  targetStage: WorkflowStage
): boolean {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage)
  const targetIndex = WORKFLOW_STAGES.indexOf(targetStage)

  if (currentIndex === -1 || targetIndex === -1) {
    return false
  }

  // Can always go to the next stage or stay at current
  // Can go back to previous stages (for rework)
  return targetIndex >= currentIndex || targetIndex === currentIndex - 1
}

/**
 * Get the progress percentage for a workflow stage
 */
export function getStageProgress(stage: WorkflowStage): number {
  const index = WORKFLOW_STAGES.indexOf(stage)
  if (index === -1) {
    return 0
  }
  // Progress is based on how far through the workflow we are
  // not_started = 0%, export = 100%
  return Math.round((index / (WORKFLOW_STAGES.length - 1)) * 100)
}

/**
 * Determine the appropriate workflow stage based on project state
 */
export function determineWorkflowStage(project: {
  workflowStage: WorkflowStage
  pages?: { status: string }[]
  pillars?: any[]
  matches?: any[]
  drafts?: { status: string }[]
}): WorkflowStage {
  // If explicitly set and not not_started, respect it
  if (project.workflowStage !== 'not_started') {
    return project.workflowStage
  }

  // Auto-determine based on project state
  const hasPages = project.pages && project.pages.length > 0
  const hasAnalyzedPages =
    project.pages && project.pages.some((p) => p.status === 'analyzed')
  const hasPillars = project.pillars && project.pillars.length > 0
  const hasMatches = project.matches && project.matches.length > 0
  const hasDrafts = project.drafts && project.drafts.length > 0
  const hasApprovedDrafts =
    project.drafts && project.drafts.some((d) => d.status === 'approved')

  if (hasApprovedDrafts) {
    return 'review'
  }
  if (hasDrafts) {
    return 'generate'
  }
  if (hasMatches) {
    return 'match'
  }
  if (hasPillars) {
    return 'configure'
  }
  if (hasAnalyzedPages) {
    return 'analyze'
  }
  if (hasPages) {
    return 'ingest'
  }

  return 'not_started'
}
