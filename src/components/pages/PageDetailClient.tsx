'use client'

import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import ContentOptionsComparison from './ContentOptionsComparison'

interface PageDetailClientProps {
  pageId: string
  projectSlug: string
  page: {
    wordCount: number | null
    contentType: string | null
    detectedTopics: string[]
    qualityScore: number | null
  }
}

export default function PageDetailClient({
  pageId,
  projectSlug,
  page,
}: PageDetailClientProps) {
  const router = useRouter()
  const toast = useToast()

  const handleGenerateSuccess = (jobId: string, pillarId: string) => {
    toast.showSuccess('Generation started. Check Jobs for status.')
    router.push(`/jobs/${jobId}`)
  }

  return (
    <ContentOptionsComparison
      pageId={pageId}
      page={page}
      onGenerateSuccess={handleGenerateSuccess}
    />
  )
}
