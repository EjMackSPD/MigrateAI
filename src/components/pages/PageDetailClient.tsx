'use client'

import { useRouter } from 'next/navigation'
import ContentOptionsComparison from './ContentOptionsComparison'
import type { ContentType } from '@/lib/utils/content-types'

interface PageDetailClientProps {
  pageId: string
  page: {
    wordCount: number | null
    contentType: string | null
    detectedTopics: string[]
    qualityScore: number | null
  }
}

export default function PageDetailClient({
  pageId,
  page,
}: PageDetailClientProps) {
  const router = useRouter()

  const handleSelectContentType = (contentType: ContentType) => {
    // Navigate to pillar selection or generation page
    // For now, we'll show an alert - this can be enhanced later
    router.push(`/pages/${pageId}?generate=${contentType}`)
  }

  return (
    <ContentOptionsComparison
      page={page}
      onSelectContentType={handleSelectContentType}
    />
  )
}
