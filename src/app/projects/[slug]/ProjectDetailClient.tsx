'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getProjectPath } from '@/lib/utils/slugify'
import { useSession } from 'next-auth/react'
import EditProjectForm from '@/components/projects/EditProjectForm'
import WorkflowProgress from '@/components/projects/WorkflowProgress'
import IngestionCrawlModal from '@/components/projects/IngestionCrawlModal'
import ClearProjectModal from '@/components/projects/ClearProjectModal'
import ProjectPagesList from './ProjectPagesList'
import ProjectRedirectsList from './ProjectRedirectsList'
import styles from './ProjectDetail.module.css'
import type { WorkflowStage } from '@/lib/utils/workflow'

interface Project {
  id: string
  slug?: string
  name: string
  clientName: string
  baseUrl: string
  description: string | null
  status: string
  workflowStage: WorkflowStage
  owner: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    pages: number
    pillars: number
    jobs: number
  }
}

interface Stats {
  pagesCrawled: number
  pagesAnalyzed: number
  pillarsCount: number
  draftsCount: number
  draftsApproved: number
}

interface ProjectDetailClientProps {
  project: Project
  stats: Stats
}

export default function ProjectDetailClient({
  project,
  stats,
}: ProjectDetailClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showCrawlModal, setShowCrawlModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [currentProject, setCurrentProject] = useState(project)

  // Sync from server when props change (e.g. after router.refresh() following clear data)
  useEffect(() => {
    setCurrentProject(project)
  }, [project])

  const isOwner = session?.user?.id === project.owner.id

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{currentProject.name}</h1>
            <p className={styles.clientName}>{currentProject.clientName}</p>
          </div>
          <div className={styles.headerActions}>
            <span className={`${styles.status} ${styles[currentProject.status]}`}>
              {currentProject.status}
            </span>
            {isOwner && (
              <>
                <button
                  onClick={() => setShowEditForm(true)}
                  className={styles.editButton}
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowClearModal(true)}
                  className={styles.clearButton}
                >
                  Clear data
                </button>
              </>
            )}
          </div>
        </div>

        {currentProject.description && (
          <p className={styles.description}>{currentProject.description}</p>
        )}

        <WorkflowProgress
          currentStage={currentProject.workflowStage}
          onStageClick={(stage) => {
            if (stage === 'ingest') setShowCrawlModal(true)
          }}
        />

        <div className={styles.info}>
          <div>
            <strong>Base URL:</strong>{' '}
            <a
              href={currentProject.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {currentProject.baseUrl}
            </a>
          </div>
          <div>
            <strong>Owner:</strong>{' '}
            {currentProject.owner.name || currentProject.owner.email}
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.pagesCrawled}</h3>
            <p className={styles.statLabel}>Pages Crawled</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.pagesAnalyzed}</h3>
            <p className={styles.statLabel}>Pages Analyzed</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.pillarsCount}</h3>
            <p className={styles.statLabel}>Pillars</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.draftsCount}</h3>
            <p className={styles.statLabel}>Drafts</p>
          </div>
          <div className={styles.statCard}>
            <h3 className={styles.statValue}>{stats.draftsApproved}</h3>
            <p className={styles.statLabel}>Approved</p>
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            href={`/projects/${getProjectPath(currentProject)}/pillars`}
            className={styles.actionButton}
          >
            View Pillars
          </Link>
          <a href="#pages" className={styles.actionButton}>
            Jump to Pages
          </a>
          <a href="#redirects" className={styles.actionButton}>
            Jump to Redirects
          </a>
        </div>

        <ProjectPagesList
          projectSlug={getProjectPath(currentProject)}
          projectName={currentProject.name}
        />

        <ProjectRedirectsList
          projectSlug={getProjectPath(currentProject)}
          projectName={currentProject.name}
        />
      </div>

      {showEditForm && (
        <EditProjectForm
          project={currentProject}
          onClose={() => setShowEditForm(false)}
          onSuccess={async () => {
            const response = await fetch(`/api/projects/${getProjectPath(currentProject)}`)
            if (response.ok) {
              const updated = await response.json()
              setCurrentProject(updated)
            }
          }}
        />
      )}

      {showCrawlModal && (
        <IngestionCrawlModal
          projectSlug={getProjectPath(currentProject)}
          baseUrl={currentProject.baseUrl}
          projectName={currentProject.name}
          onClose={() => setShowCrawlModal(false)}
        />
      )}

      {showClearModal && (
        <ClearProjectModal
          projectSlug={getProjectPath(currentProject)}
          projectName={currentProject.name}
          stats={{
            pagesCrawled: stats.pagesCrawled,
            pillarsCount: stats.pillarsCount,
            draftsCount: stats.draftsCount,
          }}
          onClose={() => setShowClearModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  )
}
