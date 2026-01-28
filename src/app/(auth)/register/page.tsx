'use client'

import { ToastProvider } from '@/contexts/ToastContext'
import RegisterContent from './RegisterContent'

export default function RegisterPage() {
  return (
    <ToastProvider>
      <RegisterContent />
    </ToastProvider>
  )
}
