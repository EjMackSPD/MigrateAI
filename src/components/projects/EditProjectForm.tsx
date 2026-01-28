'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import styles from './EditProjectForm.module.css'

interface Project {
  id: string
  name: string
  clientName: string
  baseUrl: string
  description: string | null
  status: string
}

interface EditProjectFormProps {
  project: Project
  onClose: () => void
  onSuccess?: () => void
}

export default function EditProjectForm({
  project,
  onClose,
  onSuccess,
}: EditProjectFormProps) {
  const router = useRouter()
  const toast = useToast()
  const [formData, setFormData] = useState({
    name: project.name,
    clientName: project.clientName,
    baseUrl: project.baseUrl,
    description: project.description || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [urlError, setUrlError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })

    // Validate URL in real-time
    if (e.target.name === 'baseUrl') {
      validateUrlField(e.target.value)
    }
  }

  const validateUrlField = async (url: string) => {
    if (!url || url.trim().length === 0) {
      setUrlError('')
      return
    }

    try {
      const { validateUrl } = await import('@/lib/utils/url-validator')
      const validation = validateUrl(url)

      if (validation.valid) {
        setUrlError('')
      } else {
        setUrlError(validation.error || 'Invalid URL')
      }
    } catch (err) {
      setUrlError('Error validating URL')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate URL
    const { validateUrl } = await import('@/lib/utils/url-validator')
    const urlValidation = validateUrl(formData.baseUrl)

    if (!urlValidation.valid) {
      setError(urlValidation.error || 'Invalid URL')
      setUrlError(urlValidation.error || 'Invalid URL')
      toast.showError(urlValidation.error || 'Invalid URL')
      setLoading(false)
      return
    }

    // Use normalized URL if provided
    const urlToUse = urlValidation.normalizedUrl || formData.baseUrl

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          baseUrl: urlToUse,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update project')
        toast.showError(data.error || 'Failed to update project')
        return
      }

      toast.showSuccess('Project updated successfully!')
      if (onSuccess) {
        onSuccess()
      }
      router.refresh()
      onClose()
    } catch (err) {
      setError('An error occurred. Please try again.')
      toast.showError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit Project</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">Project Name *</label>
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
            <label htmlFor="clientName">Client Name *</label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              value={formData.clientName}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="baseUrl">Base URL *</label>
            <input
              id="baseUrl"
              name="baseUrl"
              type="url"
              value={formData.baseUrl}
              onChange={handleChange}
              onBlur={() => validateUrlField(formData.baseUrl)}
              placeholder="https://example.com"
              required
              disabled={loading}
              className={urlError ? styles.inputError : ''}
            />
            {urlError && (
              <span className={styles.fieldError}>{urlError}</span>
            )}
            {!urlError && formData.baseUrl && (
              <span className={styles.fieldSuccess}>✓ Valid URL</span>
            )}
            {!urlError && !formData.baseUrl && (
              <small className={styles.helpText}>
                Enter a valid website URL (e.g., https://example.com)
              </small>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              disabled={loading}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !!urlError}
            >
              {loading ? 'Updating...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
