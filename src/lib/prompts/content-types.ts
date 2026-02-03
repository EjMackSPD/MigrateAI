export const CONTENT_TYPE_PROMPTS = {
  pillar_page: `Generate comprehensive pillar page content. This should be the definitive resource on this topic, covering all major aspects. Aim for 1500-2500 words. Include 4-6 FAQ questions. Link opportunities to subtopics that could become supporting articles.`,

  supporting_article: `Generate a focused supporting article on a specific subtopic. This should go deeper on one aspect rather than covering everything. Aim for 800-1200 words. Include 2-3 FAQ questions. Reference how this connects to the broader pillar topic.`,

  faq_page: `Generate a comprehensive FAQ page. Extract questions from the source content or infer questions users would have. Organize into logical categories. Each answer should be 40-60 words - complete but concise. Aim for 15-25 questions.`,

  glossary: `Generate a comprehensive glossary of key terms from the source content following this exact structure:

# [Topic] Glossary: Key Terms and Definitions

[1-2 sentence intro explaining what terms are covered and who this glossary serves.]

**Last Updated**: [Date]

---

## A

### [Term]
**Definition**: [Clear, concise definition in 20-40 words. Be precise and conversational.]

**Related terms**: [Link to related term], [Link to related term]

[Optional: **Example**: One sentence showing the term in context.]

---

[Continue alphabetically with all relevant terms from source content. Group terms under their first letter (A, B, C, etc.). Include at least 10-15 terms if available in source content.]

---

## Quick Reference

| Term | Brief Definition |
|------|------------------|
| [Term 1] | [10-15 word definition] |
| [Term 2] | [10-15 word definition] |
| [Term 3] | [10-15 word definition] |

[Include all terms in alphabetical order in the quick reference table.]

---

**Looking for more detail?** Explore our [Pillar Page link] or [Related Article link].

Requirements:
- Extract ALL key terms, acronyms, and concepts from source content
- Each definition must be 20-40 words - clear, complete, and conversational
- Include related terms cross-references where logical connections exist
- Organize alphabetically by first letter
- Include examples when they clarify meaning
- Create a comprehensive quick reference table at the end
- Ensure definitions are accurate to source content but written for clarity`,

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
    structuredContent?: string | null
  }>,
  contentType: keyof typeof CONTENT_TYPE_PROMPTS,
  additionalGuidance?: string
): string {
  const sourceContent = sourcePages
    .map((page, i) => {
      const content = page.structuredContent || page.extractedContent || 'No content available'
      return `Source ${i + 1}: ${page.title || page.url}\nURL: ${page.url}\n\n${content}\n\n---\n\n`
    })
    .join('')

  return `## Pillar Context

**Name**: ${pillar.name}
**Description**: ${pillar.description}
${pillar.targetAudience ? `**Target Audience**: ${pillar.targetAudience}\n` : ''}**Key Themes**: ${pillar.keyThemes.join(', ')}
${pillar.toneNotes ? `**Tone Notes**: ${pillar.toneNotes}\n` : ''}**Primary Keywords**: ${pillar.primaryKeywords.join(', ')}

## Content Type

${CONTENT_TYPE_PROMPTS[contentType]}

${additionalGuidance ? `## Additional Guidance\n\n${additionalGuidance}\n\n` : ''}## Source Content

The source content preserves headings and structure (sections, lists, FAQ Q&A pairs, etc.). Use these sections to inform how you structure the output.

${sourceContent}

## Task

Transform the source content above into a ${contentType.replace('_', ' ')} following the GEO framework. Preserve all valuable information while restructuring for AI optimization.`
}
