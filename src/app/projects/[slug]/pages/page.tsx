import { redirect } from 'next/navigation'

export default function PagesPage({
  params,
}: {
  params: { slug: string }
}) {
  redirect(`/projects/${params.slug}#pages`)
}
