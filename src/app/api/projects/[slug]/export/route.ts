import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getProjectBySlug } from '@/lib/project-access'
import { ExportService } from '@/lib/services/exporter'
import { z } from 'zod'
import { canTransitionTo } from '@/lib/utils/workflow'

const exportConfigSchema = z.object({
  format: z.enum(['markdown']).default('markdown'),
  includeMetadata: z.boolean().default(true),
  includeSchemaFiles: z.boolean().default(true),
})

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await getProjectBySlug(params.slug, session.user.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = exportConfigSchema.parse(body)

    const exporter = new ExportService()
    const zipBuffer = await exporter.exportProject(project.id, validated)

    // Mark drafts as exported
    await prisma.draft.updateMany({
      where: {
        pillar: {
          projectId: project.id,
        },
        status: 'approved',
        exportedAt: null,
      },
      data: {
        exportedAt: new Date(),
        status: 'exported',
      },
    })

    // Update workflow stage to 'export' if transitioning
    if (canTransitionTo(project.workflowStage as any, 'export')) {
      await prisma.project.update({
        where: { id: project.id },
        data: { workflowStage: 'export' },
      })
    }

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name}-export-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error exporting project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
