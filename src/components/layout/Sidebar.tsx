'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { getProjectPath } from '@/lib/utils/slugify'
import { useSidebar } from '@/contexts/SidebarContext'
import styles from './Sidebar.module.css'

interface SidebarProps {
  projects?: Array<{ id: string; slug?: string; name: string }>
}

export default function Sidebar({ projects = [] }: SidebarProps) {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/')
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '›' : '‹'}
      </button>
      <div className={styles.sidebarContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Content Migration</h2>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/dashboard"
            className={`${styles.navLink} ${isActive('/dashboard') ? styles.active : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className={`${styles.navLink} ${isActive('/projects') ? styles.active : ''}`}
          >
            All Projects
          </Link>
          <Link
            href="/jobs"
            className={`${styles.navLink} ${isActive('/jobs') ? styles.active : ''}`}
          >
            All Jobs
          </Link>
        </nav>

        {projects.length > 0 && (
          <div className={styles.projectsSection}>
            <h3 className={styles.sectionTitle}>Projects</h3>
            <ul className={styles.projectList}>
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${getProjectPath(project)}`}
                    className={`${styles.projectLink} ${isActive(`/projects/${getProjectPath(project)}`) ? styles.active : ''}`}
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.footer}>
          <Link href="/projects/new" className={styles.newProjectButton}>
            + New Project
          </Link>
          <button onClick={() => signOut()} className={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
