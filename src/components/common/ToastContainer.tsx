'use client'

import { Toast } from './Toast'
import ToastComponent from './Toast'
import styles from './ToastContainer.module.css'

interface ToastContainerProps {
  toasts: Toast[]
  onClose: (id: string) => void
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}
