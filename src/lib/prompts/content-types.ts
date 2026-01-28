export const CONTENT_TYPE_PROMPTS = {
  pillar_page: `Generate comprehensive pillar page content. This should be the definitive resource on this topic, covering all major aspects. Aim for 1500-2500 words. Include 4-6 FAQ questions. Link opportunities to subtopics that could become supporting articles.`,

  supporting_article: `Generate a focused supporting article on a specific subtopic. This should go deeper on one aspect rather than covering everything. Aim for 800-1200 words. Include 2-3 FAQ questions. Reference how this connects to the broader pillar topic.`,

  faq_page: `Generate a comprehensive FAQ page. Extract questions from the source content or infer questions users would have. Organize into logical categories. Each answer should be 40-60 words - complete but concise. Aim for 15-25 questions.`,

  glossary: `Generate a glossary of key terms from the source content. Each definition should be 20-40 words. Include related terms where connections exist. Organize alphabetically. Include a quick reference table at the end.`,

  comparison: `Generate a balanced comparison between the options or approaches discussed in the source content. Be fair to both sides. Include a quick comparison table. Cover 3-4 key comparison factors in detail. Provide clear "choose this if" guidance without being prescriptive.`,
}

export function buildUserPrompt(
  pillar: {
    name: string
    description: string
    targetAudience: string | null
    keyThemes: string[]
    toneNotes: string | null
    primaryKeywords: string[]
  },
  sourcePages: Array<{
    url: string
    title: string | null
    extractedContent: string | null
  }>,
  contentType: keyof typeof CONTENT_TYPE_PROMPTS,
  additionalGuidance?: string
): string {
  const sourceContent = sourcePages
    .map(
      (page, i) =>
        `Source ${i + 1}: ${page.title || page.url}\nURL: ${page.url}\n\n${page.extractedContent || 'No content available'}\n\n---\n\n`
    )
    .join('')

  return `## Pillar Context

**Name**: ${pillar.name}
**Description**: ${pillar.description}
${pillar.targetAudience ? `**Target Audience**: ${pillar.targetAudience}\n` : ''}**Key Themes**: ${pillar.keyThemes.join(', ')}
${pillar.toneNotes ? `**Tone Notes**: ${pillar.toneNotes}\n` : ''}**Primary Keywords**: ${pillar.primaryKeywords.join(', ')}

## Content Type

${CONTENT_TYPE_PROMPTS[contentType]}

${additionalGuidance ? `## Additional Guidance\n\n${additionalGuidance}\n\n` : ''}## Source Content

${sourceContent}

## Task

Transform the source content above into a ${contentType.replace('_', ' ')} following the GEO framework. Preserve all valuable information while restructuring for AI optimization.`
}
