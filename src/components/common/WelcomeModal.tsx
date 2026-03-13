'use client'

import { useEffect, useState } from 'react'
import styles from './WelcomeModal.module.css'

interface WelcomeModalProps {
  userName?: string | null
  onClose: () => void
}

export default function WelcomeModal({ userName, onClose }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [featureIndex, setFeatureIndex] = useState(0)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50)
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < 3; i++) {
      timers.push(setTimeout(() => setFeatureIndex(i + 1), 400 + i * 150))
    }
    return () => timers.forEach(clearTimeout)
  }, [isVisible])

  const handleGetStarted = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 280)
  }

  const features = [
    { icon: '📁', text: 'Create your first project' },
    { icon: '🕷️', text: 'Crawl and analyze websites' },
    { icon: '✨', text: 'Generate GEO-optimized content' },
  ]

  return (
    <div
      className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}
      onClick={handleGetStarted}
    >
      <div
        className={`${styles.modal} ${isVisible ? styles.visible : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.glow} />
        <div className={styles.content}>
          <div className={styles.iconWrap}>
            <div className={styles.icon}>
              <span className={styles.wave}>👋</span>
            </div>
          </div>
          <h2 className={styles.title}>
            Welcome{userName ? `, ${userName}` : ''}!
          </h2>
          <p className={styles.message}>
            Your account is ready. Let&apos;s turn your content migration into a breeze.
          </p>
          <div className={styles.features}>
            {features.map((f, i) => (
              <div
                key={i}
                className={`${styles.featureItem} ${featureIndex > i ? styles.featureVisible : ''}`}
              >
                <span className={styles.featureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
          <button onClick={handleGetStarted} className={styles.button}>
            Let&apos;s Go →
          </button>
        </div>
      </div>
    </div>
  )
}
