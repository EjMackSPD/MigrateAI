import JSZip from 'jszip'
import { prisma } from '@/lib/db'

export interface ExportConfig {
  format?: 'markdown'
  includeMetadata?: boolean
  includeSchemaFiles?: boolean
}

export class ExportService {
  async exportProject(
    projectId: string,
    config: ExportConfig = {}
  ): Promise<Buffer> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        pillars: {
          include: {
            drafts: {
              where: {
                status: 'approved',
              },
              include: {
                versions: {
                  where: {
                    versionNumber: 1,
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const zip = new JSZip()

    // Create manifest
    const manifest = {
      project: {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        baseUrl: project.baseUrl,
        exportedAt: new Date().toISOString(),
      },
      pillars: project.pillars.map((pillar) => ({
        id: pillar.id,
        name: pillar.name,
        slug: pillar.slug,
        drafts: pillar.drafts.map((draft) => ({
          id: draft.id,
          title: draft.title,
          slug: draft.slug,
          contentType: draft.contentType,
        })),
      })),
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // Create redirects map
    const redirects: Record<string, string> = {}
    for (const pillar of project.pillars) {
      for (const draft of pillar.drafts) {
        const sourcePages = await prisma.page.findMany({
          where: {
            id: { in: draft.sourcePageIds },
          },
          select: {
            url: true,
          },
        })

        for (const page of sourcePages) {
          redirects[page.url] = `/${pillar.slug}/${draft.slug}`
        }
      }
    }

    zip.file('redirects.json', JSON.stringify(redirects, null, 2))

    // Export drafts
    for (const pillar of project.pillars) {
      const pillarFolder = zip.folder(`pillars/${pillar.slug}`)
      if (!pillarFolder) continue

      // Pillar metadata
      if (config.includeMetadata) {
        pillarFolder.file(
          '_pillar-meta.json',
          JSON.stringify(
            {
              id: pillar.id,
              name: pillar.name,
              description: pillar.description,
              targetAudience: pillar.targetAudience,
              keyThemes: pillar.keyThemes,
            },
            null,
            2
          )
        )
      }

      for (const draft of pillar.drafts) {
        const content = draft.versions[0]?.content || draft.content

        // Markdown file
        pillarFolder.file(`${draft.slug}.md`, content)

        // Schema file if requested
        if (config.includeSchemaFiles && draft.schemaRecommendations) {
          pillarFolder.file(
            `${draft.slug}-schema.json`,
            JSON.stringify(draft.schemaRecommendations, null, 2)
          )
        }
      }
    }

    // Generate ZIP buffer
    return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
  }

  async exportPillar(
    pillarId: string,
    config: ExportConfig = {}
  ): Promise<Buffer> {
    const pillar = await prisma.pillar.findUnique({
      where: { id: pillarId },
      include: {
        drafts: {
          where: {
            status: 'approved',
          },
          include: {
            versions: {
              where: {
                versionNumber: 1,
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!pillar) {
      throw new Error('Pillar not found')
    }

    const zip = new JSZip()

    // Pillar metadata
    if (config.includeMetadata) {
      zip.file(
        '_pillar-meta.json',
        JSON.stringify(
          {
            id: pillar.id,
            name: pillar.name,
            description: pillar.description,
            targetAudience: pillar.targetAudience,
            keyThemes: pillar.keyThemes,
          },
          null,
          2
        )
      )
    }

    // Export drafts
    for (const draft of pillar.drafts) {
      const content = draft.versions[0]?.content || draft.content
      zip.file(`${draft.slug}.md`, content)

      if (config.includeSchemaFiles && draft.schemaRecommendations) {
        zip.file(
          `${draft.slug}-schema.json`,
          JSON.stringify(draft.schemaRecommendations, null, 2)
        )
      }
    }

    return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
  }
}
