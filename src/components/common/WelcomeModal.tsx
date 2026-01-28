'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import styles from './WelcomeModal.module.css'

interface WelcomeModalProps {
  userName?: string | null
  onClose: () => void
}

export default function WelcomeModal({ userName, onClose }: WelcomeModalProps) {
  const toast = useToast()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleGetStarted = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 300)
  }

  return (
    <div className={`${styles.overlay} ${isVisible ? styles.visible : ''}`} onClick={handleGetStarted}>
      <div className={`${styles.modal} ${isVisible ? styles.visible : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <div className={styles.icon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 className={styles.title}>Welcome{userName ? `, ${userName}` : ''}!</h2>
          <p className={styles.message}>
            Your account has been created successfully. You're all set to start migrating and transforming content.
          </p>
          <div className={styles.features}>
            <div className={styles.featureItem}>
              <span className={styles.checkmark}>✓</span>
              <span>Create your first project</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.checkmark}>✓</span>
              <span>Start crawling websites</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.checkmark}>✓</span>
              <span>Generate GEO-optimized content</span>
            </div>
          </div>
          <button onClick={handleGetStarted} className={styles.button}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}
