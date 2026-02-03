/**
 * Convert a string to a URL-safe slug.
 * "My Cool Project" -> "my-cool-project"
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'project'
}

/** Get the URL path segment for a project (slug or id). Rejects "undefined" string. */
export function getProjectPath(project: { id: string; slug?: string | null }): string {
  const slug = project.slug
  if (slug && typeof slug === 'string' && slug !== 'undefined' && slug.trim()) return slug
  return project.id
}

/** Get the URL path for a page: /projects/{projectSlug}/pages/{pageSlug} */
export function getPagePath(
  project: { id: string; slug?: string | null },
  page: { id: string; slug?: string | null }
): string {
  const projectSlug = getProjectPath(project)
  const pageSlug = page.slug
  if (pageSlug && typeof pageSlug === 'string' && pageSlug !== 'undefined' && pageSlug.trim()) {
    return `/projects/${projectSlug}/pages/${pageSlug}`
  }
  return `/projects/${projectSlug}/pages/${page.id}`
}
