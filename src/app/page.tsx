import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './Home.module.css'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  // Redirect authenticated users to dashboard
  if (session?.user?.id) {
    redirect('/dashboard')
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.content}>
          <h1 className={styles.title}>Content Migration & GEO Transformation Tool</h1>
          <p className={styles.subtitle}>
            Migrate legacy website content while simultaneously transforming it for 
            Generative Engine Optimization (GEO). Optimized for AI search engines.
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={`${styles.icon} ${styles.iconCrawl}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h3>Automated Crawling</h3>
              <p>Intelligently crawl and extract content from legacy websites</p>
            </div>
            <div className={styles.feature}>
              <div className={`${styles.icon} ${styles.iconAnalysis}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="11" y1="7" x2="11" y2="15"></line>
                  <line x1="7" y1="11" x2="15" y2="11"></line>
                </svg>
              </div>
              <h3>AI-Powered Analysis</h3>
              <p>Semantic analysis with embeddings and topic extraction</p>
            </div>
            <div className={styles.feature}>
              <div className={`${styles.icon} ${styles.iconOptimize}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3>GEO Optimization</h3>
              <p>Generate content optimized for AI search engines</p>
            </div>
            <div className={styles.feature}>
              <div className={`${styles.icon} ${styles.iconOrganize}`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <h3>Strategic Organization</h3>
              <p>Organize content around strategic pillars</p>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/register" className={styles.primaryButton}>
              Get Started
            </Link>
            <Link href="/login" className={styles.secondaryButton}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
