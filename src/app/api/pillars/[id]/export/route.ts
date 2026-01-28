import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExportService } from '@/lib/services/exporter'
import { z } from 'zod'

const exportConfigSchema = z.object({
  format: z.enum(['markdown']).default('markdown'),
  includeMetadata: z.boolean().default(true),
  includeSchemaFiles: z.boolean().default(true),
})

async function checkPillarAccess(pillarId: string, userId: string) {
  const pillar = await prisma.pillar.findFirst({
    where: {
      id: pillarId,
      project: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
    },
  })
  return pillar
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pillar = await checkPillarAccess(params.id, session.user.id)
    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = exportConfigSchema.parse(body)

    const exporter = new ExportService()
    const zipBuffer = await exporter.exportPillar(params.id, validated)

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${pillar.slug}-export-${new Date().toISOString().split('T')[0]}.zip"`,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error exporting pillar:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
