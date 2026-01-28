'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useToast } from '@/contexts/ToastContext'
import WelcomeModal from '@/components/common/WelcomeModal'
import styles from './Register.module.css'

export default function RegisterContent() {
  const router = useRouter()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [registeredName, setRegisteredName] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      toast.showError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      toast.showError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        toast.showError(data.error || 'Registration failed')
        return
      }

      toast.showSuccess('Account created successfully!')

      // Auto-login the user
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Registration succeeded but login failed - redirect to login
        toast.showInfo('Account created. Please sign in.')
        router.push('/login?registered=true')
        return
      }

      // Show welcome modal
      setRegisteredName(name)
      setShowWelcome(true)
    } catch (err) {
      setError('An error occurred. Please try again.')
      toast.showError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWelcomeClose = () => {
    setShowWelcome(false)
    router.push('/dashboard')
    router.refresh()
  }


  return (
    <>
      {showWelcome && (
        <WelcomeModal userName={registeredName} onClose={handleWelcomeClose} />
      )}
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Content Migration Tool</h1>
          <h2 className={styles.subtitle}>Create Account</h2>
          
          {error && <div className={styles.error}>{error}</div>}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            
            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            
            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          
          <p className={styles.link}>
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </>
  )
}
