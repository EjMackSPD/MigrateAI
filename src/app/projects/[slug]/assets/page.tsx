import { redirect } from 'next/navigation'

export default function AssetsPage({
  params,
}: {
  params: { slug: string }
}) {
  redirect(`/projects/${params.slug}#assets`)
}
