import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import styles from './Projects.module.css'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          pages: true,
          pillars: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return (
    <MainLayout projects={projects}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Projects</h1>
          <Link href="/projects/new" className={styles.newButton}>
            + New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className={styles.empty}>
            <p>No projects yet. Create your first project to get started.</p>
            <Link href="/projects/new" className={styles.emptyButton}>
              Create Project
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{project.name}</h2>
                  <span className={`${styles.status} ${styles[project.status]}`}>
                    {project.status}
                  </span>
                </div>
                <p className={styles.clientName}>{project.clientName}</p>
                {project.description && (
                  <p className={styles.description}>{project.description}</p>
                )}
                <div className={styles.stats}>
                  <span>{project._count.pages} pages</span>
                  <span>{project._count.pillars} pillars</span>
                </div>
                <div className={styles.footer}>
                  <span className={styles.owner}>
                    Owner: {project.owner.name || project.owner.email}
                  </span>
                  <span className={styles.updated}>
                    Updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
