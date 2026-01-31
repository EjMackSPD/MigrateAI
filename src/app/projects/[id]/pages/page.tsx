import { redirect } from 'next/navigation'

export default function PagesPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/projects/${params.id}#pages`)
}
