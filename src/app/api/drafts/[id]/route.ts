import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateDraftSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  changeNotes: z.string().optional(),
})

async function checkDraftAccess(draftId: string, userId: string) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      pillar: {
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
    },
  })
  return draft
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draft = await checkDraftAccess(params.id, session.user.id)
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const fullDraft = await prisma.draft.findUnique({
      where: { id: params.id },
      include: {
        pillar: {
          select: {
            id: true,
            name: true,
            projectId: true,
          },
        },
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 10,
        },
      },
    })

    // Get source pages
    const sourcePages = await prisma.page.findMany({
      where: {
        id: { in: draft.sourcePageIds },
      },
      select: {
        id: true,
        url: true,
        title: true,
        extractedContent: true,
      },
    })

    return NextResponse.json({
      ...fullDraft,
      sourcePages,
    })
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const draft = await checkDraftAccess(params.id, session.user.id)
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateDraftSchema.parse(body)

    // Get current version number
    const currentVersion = await prisma.draftVersion.findFirst({
      where: { draftId: params.id },
      orderBy: { versionNumber: 'desc' },
    })

    const newVersionNumber = currentVersion
      ? currentVersion.versionNumber + 1
      : 1

    // Update draft
    const updateData: any = {}
    if (validated.title) {
      updateData.title = validated.title
      updateData.slug = validated.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
    if (validated.content) {
      updateData.content = validated.content
    }

    await prisma.draft.update({
      where: { id: params.id },
      data: updateData,
    })

    // Create new version if content changed
    if (validated.content && validated.content !== draft.content) {
      await prisma.draftVersion.create({
        data: {
          draftId: params.id,
          content: validated.content,
          versionNumber: newVersionNumber,
          changeNotes: validated.changeNotes || 'Content updated',
          createdBy: session.user.email,
        },
      })
    }

    const updated = await prisma.draft.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
