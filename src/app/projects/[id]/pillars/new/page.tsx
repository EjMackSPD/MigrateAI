'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import MainLayout from '@/components/layout/MainLayout'
import styles from './NewPillar.module.css'

export default function NewPillarPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAudience: '',
    toneNotes: '',
    primaryKeywords: '',
    keyThemes: '',
    priority: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/pillars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: formData.name,
          description: formData.description,
          targetAudience: formData.targetAudience || undefined,
          toneNotes: formData.toneNotes || undefined,
          primaryKeywords: formData.primaryKeywords
            ? formData.primaryKeywords.split(',').map((k) => k.trim())
            : undefined,
          keyThemes: formData.keyThemes
            ? formData.keyThemes.split(',').map((t) => t.trim())
            : undefined,
          priority: formData.priority,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create pillar')
        toast.showError(data.error || 'Failed to create pillar')
        return
      }

      toast.showSuccess('Pillar created successfully!')
      router.push(`/pillars/${data.id}`)
    } catch (err) {
      setError('An error occurred. Please try again.')
      toast.showError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Create New Pillar</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">Pillar Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
              disabled={loading}
              placeholder="Comprehensive description of this content pillar..."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="targetAudience">Target Audience</label>
            <input
              id="targetAudience"
              name="targetAudience"
              type="text"
              value={formData.targetAudience}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., L&D professionals, HR managers"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="keyThemes">Key Themes (comma-separated)</label>
            <input
              id="keyThemes"
              name="keyThemes"
              type="text"
              value={formData.keyThemes}
              onChange={handleChange}
              disabled={loading}
              placeholder="theme1, theme2, theme3"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="primaryKeywords">Primary Keywords (comma-separated)</label>
            <input
              id="primaryKeywords"
              name="primaryKeywords"
              type="text"
              value={formData.primaryKeywords}
              onChange={handleChange}
              disabled={loading}
              placeholder="keyword1, keyword2"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="toneNotes">Tone Notes</label>
            <textarea
              id="toneNotes"
              name="toneNotes"
              value={formData.toneNotes}
              onChange={handleChange}
              rows={3}
              disabled={loading}
              placeholder="Professional but accessible. Emphasize practical advice."
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="priority">Priority</label>
            <input
              id="priority"
              name="priority"
              type="number"
              value={formData.priority}
              onChange={handleChange}
              min="0"
              disabled={loading}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => router.back()}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Pillar'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
