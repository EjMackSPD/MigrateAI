'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './Header.module.css'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h1 className={styles.logo}>Content Migration Tool</h1>
        </div>
        <div className={styles.right}>
          {session?.user && (
            <>
              <Link href="/profile" className={styles.profileLink}>
                {session.user.name || session.user.email}
              </Link>
              <Link href="/settings" className={styles.settingsLink}>
                Settings
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
