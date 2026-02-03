'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import styles from './Members.module.css'

interface Member {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function ProjectMembersPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectSlug = params.slug as string
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [projectSlug])

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectSlug}/members`)
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      setMembers(data)
    } catch (err) {
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')

    try {
      const response = await fetch(`/api/projects/${projectSlug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add member')
        toast.showError(data.error || 'Failed to add member')
        return
      }

      toast.showSuccess('Member added successfully!')
      setEmail('')
      setRole('member')
      fetchMembers()
    } catch (err) {
      setError('An error occurred')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(
        `/api/projects/${projectSlug}/members/${userId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to remove member')

      toast.showSuccess('Member removed successfully')
      fetchMembers()
    } catch (err) {
      setError('Failed to remove member')
      toast.showError('Failed to remove member')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectSlug}/members/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      )

      if (!response.ok) throw new Error('Failed to update role')

      toast.showSuccess('Member role updated')
      fetchMembers()
    } catch (err) {
      setError('Failed to update role')
      toast.showError('Failed to update role')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <p>Loading...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Project Members</h1>
          <button
            onClick={() => router.back()}
            className={styles.backButton}
          >
            ← Back
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Member</h2>
          <form onSubmit={handleAddMember} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={adding}
                placeholder="user@example.com"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                disabled={adding}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className={styles.addButton}
            >
              {adding ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Current Members</h2>
          {members.length === 0 ? (
            <p className={styles.empty}>No members yet</p>
          ) : (
            <div className={styles.memberList}>
              {members.map((member) => (
                <div key={member.id} className={styles.memberCard}>
                  <div className={styles.memberInfo}>
                    <h3 className={styles.memberName}>
                      {member.user.name || member.user.email}
                    </h3>
                    <p className={styles.memberEmail}>{member.user.email}</p>
                  </div>
                  <div className={styles.memberActions}>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateRole(member.user.id, e.target.value)
                      }
                      className={styles.roleSelect}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
