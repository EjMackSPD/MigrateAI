'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/contexts/ToastContext'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import Sidebar from './Sidebar'
import Header from './Header'
import styles from './MainLayout.module.css'

interface MainLayoutProps {
  children: React.ReactNode
  projects?: Array<{ id: string; name: string }>
}

function MainLayoutInner({ children, projects }: MainLayoutProps) {
  const { collapsed } = useSidebar()
  return (
    <div className={styles.container}>
      <Sidebar projects={projects} />
      <div className={`${styles.main} ${collapsed ? styles.mainExpanded : ''}`}>
            <Header />
          <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}

export default function MainLayout(props: MainLayoutProps) {
  return (
    <SessionProvider>
      <ToastProvider>
        <SidebarProvider>
          <MainLayoutInner {...props} />
        </SidebarProvider>
      </ToastProvider>
    </SessionProvider>
  )
}
