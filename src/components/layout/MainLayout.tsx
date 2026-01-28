'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/contexts/ToastContext'
import Sidebar from './Sidebar'
import Header from './Header'
import styles from './MainLayout.module.css'

interface MainLayoutProps {
  children: React.ReactNode
  projects?: Array<{ id: string; name: string }>
}

export default function MainLayout({ children, projects }: MainLayoutProps) {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className={styles.container}>
          <Sidebar projects={projects} />
          <div className={styles.main}>
            <Header />
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </ToastProvider>
    </SessionProvider>
  )
}
