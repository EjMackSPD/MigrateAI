'use client'

import {
  WORKFLOW_STAGES,
  WORKFLOW_STAGE_LABELS,
  WORKFLOW_STAGE_ICONS,
  getStageProgress,
  type WorkflowStage,
} from '@/lib/utils/workflow'
import styles from './WorkflowProgress.module.css'

interface WorkflowProgressProps {
  currentStage: WorkflowStage
  onStageClick?: (stage: WorkflowStage) => void
}

export default function WorkflowProgress({
  currentStage,
  onStageClick,
}: WorkflowProgressProps) {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage)
  const progress = getStageProgress(currentStage)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Workflow Progress</h3>
        <span className={styles.progressText}>{progress}%</span>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={styles.stagesContainer}>
        {WORKFLOW_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isUpcoming = index > currentIndex
          const isLast = index === WORKFLOW_STAGES.length - 1
          const isClickable = stage === 'ingest' && onStageClick

          return (
            <div key={stage} className={styles.stageWrapper}>
              <div
                className={`${styles.stage} ${
                  isCompleted ? styles.completed : ''
                } ${isCurrent ? styles.current : ''} ${
                  isUpcoming ? styles.upcoming : ''
                } ${isClickable ? styles.clickable : ''}`}
                title={WORKFLOW_STAGE_LABELS[stage]}
                role={isClickable ? 'button' : undefined}
                onClick={isClickable ? () => onStageClick(stage) : undefined}
              >
                <span className={styles.stageIcon}>
                  {WORKFLOW_STAGE_ICONS[stage]}
                </span>
                <span className={styles.stageLabel}>
                  {WORKFLOW_STAGE_LABELS[stage]}
                </span>
                {isCompleted && <span className={styles.checkmark}>✓</span>}
                {isCurrent && <span className={styles.currentDot}></span>}
              </div>
              {!isLast && (
                <div
                  className={`${styles.connector} ${
                    isCompleted ? styles.connectorCompleted : ''
                  } ${isCurrent ? styles.connectorActive : ''}`}
                >
                  <div className={styles.connectorLine}></div>
                  {isCompleted && (
                    <div className={styles.connectorAnimation}></div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
