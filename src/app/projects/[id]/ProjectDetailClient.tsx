'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import EditProjectForm from '@/components/projects/EditProjectForm'
import styles from './ProjectDetail.module.css'

interface Project {
  id: string
  name: string
  clientName: string
  baseUrl: string
  description: string | null
  status: string
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
  const { data: session } = useSession()
  const [showEditForm, setShowEditForm] = useState(false)
  const [currentProject, setCurrentProject] = useState(project)

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
              <button
                onClick={() => setShowEditForm(true)}
                className={styles.editButton}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {currentProject.description && (
          <p className={styles.description}>{currentProject.description}</p>
        )}

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
          <Link href={`/projects/${currentProject.id}/crawl`} className={styles.actionButton}>
            Start Crawl
          </Link>
          <Link
            href={`/projects/${currentProject.id}/pillars`}
            className={styles.actionButton}
          >
            View Pillars
          </Link>
          <Link
            href={`/projects/${currentProject.id}/pages`}
            className={styles.actionButton}
          >
            View Pages
          </Link>
        </div>
      </div>

      {showEditForm && (
        <EditProjectForm
          project={currentProject}
          onClose={() => setShowEditForm(false)}
          onSuccess={async () => {
            // Refresh project data
            const response = await fetch(`/api/projects/${currentProject.id}`)
            if (response.ok) {
              const updated = await response.json()
              setCurrentProject(updated)
            }
          }}
        />
      )}
    </>
  )
}
