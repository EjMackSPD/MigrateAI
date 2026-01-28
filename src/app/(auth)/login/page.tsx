'use client'

import { ToastProvider } from '@/contexts/ToastContext'
import LoginContent from './LoginContent'

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginContent />
    </ToastProvider>
  )
}
