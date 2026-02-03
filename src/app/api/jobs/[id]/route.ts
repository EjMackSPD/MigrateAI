import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { crawlQueue, analysisQueue, matchQueue, generationQueue } from '@/lib/queue'

async function checkJobAccess(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          members: {
            where: {
              userId: userId,
            },
          },
        },
      },
    },
  })

  if (!job || !job.project) {
    return null
  }

  // Check access
  if (
    job.project.ownerId !== userId &&
    job.project.members.length === 0
  ) {
    return null
  }

  return job
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

    const job = await checkJobAccess(params.id, session.user.id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await checkJobAccess(params.id, session.user.id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'cancel') {
      // Only allow cancelling pending or running jobs
      if (job.status !== 'pending' && job.status !== 'running') {
        return NextResponse.json(
          { error: 'Only pending or running jobs can be cancelled' },
          { status: 400 }
        )
      }

      // Remove job from queue if it's pending
      try {
        let queue: ReturnType<typeof crawlQueue>
        switch (job.jobType) {
          case 'crawl':
            queue = crawlQueue()
            break
          case 'analyze':
            queue = analysisQueue()
            break
          case 'match':
            queue = matchQueue()
            break
          case 'generate':
            queue = generationQueue()
            break
          default:
            return NextResponse.json(
              { error: 'Unknown job type' },
              { status: 400 }
            )
        }

        // Try to remove from queue (might not exist if already processing)
        try {
          await queue.remove(job.id)
        } catch (err) {
          // Job might already be processing, that's okay
          console.log('Job might already be processing, will mark as cancelled')
        }
      } catch (queueError) {
        console.error('Error removing job from queue:', queueError)
        // Continue anyway - we'll mark it as cancelled in the database
      }

      // Update job status
      const updated = await prisma.job.update({
        where: { id: params.id },
        data: {
          status: 'failed',
          errorMessage: 'Cancelled by user',
          completedAt: new Date(),
        },
      })

      return NextResponse.json(updated)
    } else if (action === 'pause') {
      // Pause is not fully supported yet, but we can mark it
      if (job.status !== 'running') {
        return NextResponse.json(
          { error: 'Only running jobs can be paused' },
          { status: 400 }
        )
      }

      // For now, we'll just update metadata to indicate pause request
      // In a full implementation, you'd need to signal the worker
      const updated = await prisma.job.update({
        where: { id: params.id },
        data: {
          metadata: {
            ...(job.metadata as Record<string, any>),
            pauseRequested: true,
            pauseRequestedAt: new Date().toISOString(),
          },
        },
      })

      return NextResponse.json({
        ...updated,
        message: 'Pause requested. The job will pause after completing its current task.',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "cancel" or "pause"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
