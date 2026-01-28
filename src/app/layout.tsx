import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/contexts/ToastContext'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Content Migration Tool',
  description: 'Migrate and transform content with GEO optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
